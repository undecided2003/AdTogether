import { lookup as dnsLookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import type { IncomingMessage } from 'node:http';

const DEFAULT_USER_AGENT = 'AdTogether URL preview/1.0';
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

export class SafeUrlFetchError extends Error {
  constructor(message = 'The URL could not be fetched safely') {
    super(message);
    this.name = 'SafeUrlFetchError';
  }
}

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export interface SafeUrlFetchOptions {
  allowedContentTypes: readonly string[];
  maxBytes: number;
  timeoutMs: number;
  maxRedirects?: number;
  userAgent?: string;
}

export interface SafeUrlFetchResult {
  url: URL;
  body: Buffer;
  contentType: string;
}

interface RequestedResponse {
  response: IncomingMessage;
  clearDeadline: () => void;
}

function hostWithoutBrackets(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
}

function ipv4ToNumber(address: string): number | null {
  const octets = address.split('.');
  if (octets.length !== 4) return null;

  let result = 0;
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return null;
    const value = Number(octet);
    if (value > 255) return null;
    result = (result * 256) + value;
  }
  return result;
}

function isPrivateIpv4(address: string): boolean {
  const value = ipv4ToNumber(address);
  if (value === null) return true;

  const inRange = (network: number, prefix: number) => {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return ((value >>> 0) & mask) === ((network >>> 0) & mask);
  };

  return (
    inRange(0x00000000, 8) || // "this" network and unspecified
    inRange(0x0a000000, 8) || // RFC 1918
    inRange(0x64400000, 10) || // carrier-grade NAT
    inRange(0x7f000000, 8) || // loopback
    inRange(0xa9fe0000, 16) || // link-local
    inRange(0xac100000, 12) || // RFC 1918
    inRange(0xc0000000, 24) || // IETF protocol assignments
    inRange(0xc0000200, 24) || // TEST-NET-1
    inRange(0xc0586300, 24) || // 6to4 relay anycast
    inRange(0xc0a80000, 16) || // RFC 1918
    inRange(0xc6120000, 15) || // benchmarking
    inRange(0xc6336400, 24) || // TEST-NET-2
    inRange(0xcb007100, 24) || // TEST-NET-3
    inRange(0xe0000000, 4) // multicast and reserved
  );
}

function ipv6Bytes(address: string): number[] | null {
  const normalized = address.toLowerCase().split('%')[0];
  if (!normalized || normalized.includes(':::')) return null;

  const halves = normalized.split('::');
  if (halves.length > 2) return null;

  const expand = (part: string): string[] => (part ? part.split(':') : []);
  const left = expand(halves[0]);
  const right = halves.length === 2 ? expand(halves[1]) : [];
  const groups = [...left, ...right];

  const ipv4Index = groups.findIndex((group) => group.includes('.'));
  if (ipv4Index !== -1) {
    if (ipv4Index !== groups.length - 1) return null;
    const ipv4 = ipv4ToNumber(groups[ipv4Index]);
    if (ipv4 === null) return null;
    groups.splice(ipv4Index, 1,
      ((ipv4 >>> 16) & 0xffff).toString(16),
      (ipv4 & 0xffff).toString(16));
  }

  if (halves.length === 2) {
    const missing = 8 - groups.length;
    if (missing < 1) return null;
    groups.splice(left.length, 0, ...Array(missing).fill('0'));
  }
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    return null;
  }

  return groups.flatMap((group) => {
    const value = Number.parseInt(group, 16);
    return [(value >>> 8) & 0xff, value & 0xff];
  });
}

function bytesContainPrivateIpv4(bytes: number[]): boolean {
  const ipv4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
  return isPrivateIpv4(ipv4);
}

function isPrivateIpv6(address: string): boolean {
  const bytes = ipv6Bytes(address);
  if (!bytes) return true;

  const allZero = bytes.every((byte) => byte === 0);
  const loopback = bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1;
  const isIpv4Mapped = bytes.slice(0, 10).every((byte) => byte === 0) &&
    bytes[10] === 0xff && bytes[11] === 0xff;
  const isIpv4Compatible = bytes.slice(0, 12).every((byte) => byte === 0);
  const isNat64 = bytes[0] === 0x00 && bytes[1] === 0x64 &&
    bytes[2] === 0xff && bytes[3] === 0x9b && bytes.slice(4, 12).every((byte) => byte === 0);
  const documentation = bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8;

  return allZero || loopback ||
    (bytes[0] & 0xfe) === 0xfc || // unique local
    (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) || // link-local
    bytes[0] === 0xff || // multicast
    documentation ||
    ((isIpv4Mapped || isIpv4Compatible || isNat64) && bytesContainPrivateIpv4(bytes));
}

function isPublicAddress(address: string, family: number): boolean {
  return family === 4 ? !isPrivateIpv4(address) : family === 6 && !isPrivateIpv6(address);
}

/** Validate the URL syntax before displaying or storing it. */
export function parseSafeHttpUrl(value: unknown): URL {
  if (typeof value !== 'string') throw new SafeUrlFetchError('A URL is required');
  const rawUrl = value.trim();
  if (!rawUrl || rawUrl.length > 2_048) throw new SafeUrlFetchError('Invalid URL');

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafeUrlFetchError('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SafeUrlFetchError('Only HTTP and HTTPS URLs are supported');
  }
  if (!url.hostname || url.username || url.password) {
    throw new SafeUrlFetchError('Invalid URL');
  }

  const hostname = hostWithoutBrackets(url.hostname).toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new SafeUrlFetchError('The URL is not publicly reachable');
  }
  const literalFamily = isIP(hostname);
  if (literalFamily && !isPublicAddress(hostname, literalFamily)) {
    throw new SafeUrlFetchError('The URL is not publicly reachable');
  }
  return url;
}

async function resolvePublicAddress(url: URL): Promise<ResolvedAddress> {
  const hostname = hostWithoutBrackets(url.hostname);
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (!isPublicAddress(hostname, literalFamily)) {
      throw new SafeUrlFetchError('The URL is not publicly reachable');
    }
    return { address: hostname, family: literalFamily as 4 | 6 };
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await dnsLookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SafeUrlFetchError('The URL hostname could not be resolved');
  }

  if (!records.length || records.some((record) => !isPublicAddress(record.address, record.family))) {
    throw new SafeUrlFetchError('The URL is not publicly reachable');
  }
  const selected = records[0];
  return { address: selected.address, family: selected.family as 4 | 6 };
}

function requestOnce(url: URL, resolved: ResolvedAddress, options: SafeUrlFetchOptions): Promise<RequestedResponse> {
  const transport = url.protocol === 'https:' ? https : http;
  const hostname = hostWithoutBrackets(url.hostname);

  return new Promise((resolve, reject) => {
    let settled = false;
    let response: IncomingMessage | null = null;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const clearDeadline = () => {
      if (deadline) {
        clearTimeout(deadline);
        deadline = undefined;
      }
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearDeadline();
      reject(error instanceof SafeUrlFetchError
        ? error
        : new SafeUrlFetchError('The URL could not be fetched safely'));
    };

    const request = transport.request({
      protocol: url.protocol,
      hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      // Node does not follow redirects itself; each redirect is validated below.
      // A one-off agent forces DNS validation for every outbound request.
      agent: false,
      headers: {
        'accept': options.allowedContentTypes.join(', '),
        'accept-encoding': 'identity',
        'user-agent': options.userAgent || DEFAULT_USER_AGENT,
      },
      lookup: (_requestedHostname, _lookupOptions, callback) => {
        callback(null, resolved.address, resolved.family);
      },
      ...(url.protocol === 'https:' && isIP(hostname) === 0 ? { servername: hostname } : {}),
    }, (incomingResponse) => {
      if (settled) {
        incomingResponse.destroy();
        return;
      }
      settled = true;
      response = incomingResponse;
      resolve({ response: incomingResponse, clearDeadline });
    });

    // request.setTimeout is an inactivity timer. Keep a separate absolute
    // deadline so a peer cannot retain a server worker by dripping bytes.
    deadline = setTimeout(() => {
      const timeoutError = new SafeUrlFetchError('The URL request timed out');
      if (response) response.destroy(timeoutError);
      else request.destroy(timeoutError);
    }, options.timeoutMs);
    request.setTimeout(options.timeoutMs, () => {
      request.destroy(new SafeUrlFetchError('The URL request timed out'));
    });
    request.on('error', fail);
    request.end();
  });
}

function discard(response: IncomingMessage): void {
  response.destroy();
}

function normalizedContentType(response: IncomingMessage): string {
  const raw = response.headers['content-type'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ? value.split(';', 1)[0].trim().toLowerCase() : '';
}

function allowedContentType(contentType: string, allowed: readonly string[]): boolean {
  return allowed.some((candidate) => {
    const normalized = candidate.toLowerCase();
    return normalized.endsWith('/*')
      ? contentType.startsWith(normalized.slice(0, -1))
      : contentType === normalized;
  });
}

function contentLength(response: IncomingMessage): number | null {
  const raw = response.headers['content-length'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  if (!/^\d+$/.test(value)) return Number.POSITIVE_INFINITY;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function readLimitedBody(response: IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let complete = false;
    const fail = (error: unknown) => {
      if (complete) return;
      complete = true;
      reject(error instanceof SafeUrlFetchError
        ? error
        : new SafeUrlFetchError('The URL response could not be read safely'));
    };

    response.on('data', (chunk: Buffer | string) => {
      if (complete) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > maxBytes) {
        response.destroy(new SafeUrlFetchError('The URL response is too large'));
        return;
      }
      chunks.push(buffer);
    });
    response.on('end', () => {
      if (complete) return;
      complete = true;
      resolve(Buffer.concat(chunks, total));
    });
    response.on('aborted', () => fail(new SafeUrlFetchError('The URL response was interrupted')));
    response.on('error', fail);
  });
}

async function fetchRedirects(
  url: URL,
  options: SafeUrlFetchOptions,
  redirectsRemaining: number,
): Promise<SafeUrlFetchResult> {
  const resolved = await resolvePublicAddress(url);
  const requested = await requestOnce(url, resolved, options);
  const { response } = requested;

  try {
    const status = response.statusCode || 0;
    if (REDIRECT_STATUS_CODES.has(status)) {
      const location = response.headers.location;
      discard(response);
      if (!location || redirectsRemaining <= 0) {
        throw new SafeUrlFetchError('The URL redirected too many times');
      }

      let nextUrl: URL;
      try {
        nextUrl = parseSafeHttpUrl(new URL(location, url).toString());
      } catch (error) {
        if (error instanceof SafeUrlFetchError) throw error;
        throw new SafeUrlFetchError('The URL redirect is invalid');
      }
      return fetchRedirects(nextUrl, options, redirectsRemaining - 1);
    }

    if (status < 200 || status >= 300) {
      discard(response);
      throw new SafeUrlFetchError('The URL did not return a successful response');
    }

    const encoding = response.headers['content-encoding'];
    const contentEncoding = (Array.isArray(encoding) ? encoding[0] : encoding || 'identity').toLowerCase();
    if (contentEncoding !== 'identity') {
      discard(response);
      throw new SafeUrlFetchError('The URL returned an unsupported content encoding');
    }

    const type = normalizedContentType(response);
    if (!type || !allowedContentType(type, options.allowedContentTypes)) {
      discard(response);
      throw new SafeUrlFetchError('The URL returned an unsupported content type');
    }

    const length = contentLength(response);
    if (length !== null && length > options.maxBytes) {
      discard(response);
      throw new SafeUrlFetchError('The URL response is too large');
    }

    return { url, body: await readLimitedBody(response, options.maxBytes), contentType: type };
  } finally {
    requested.clearDeadline();
  }
}

/**
 * Fetch a public HTTP(S) resource without following unvalidated redirects.
 * Every hop is DNS-resolved, checked for private addresses, and pinned to the
 * checked address so a DNS rebinding response cannot change the connection.
 */
export async function fetchPublicUrl(value: unknown, options: SafeUrlFetchOptions): Promise<SafeUrlFetchResult> {
  if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 1 ||
    !Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 ||
    !options.allowedContentTypes.length) {
    throw new Error('Invalid safe URL fetch options');
  }
  const url = parseSafeHttpUrl(value);
  const redirects = options.maxRedirects ?? 3;
  return fetchRedirects(url, options, redirects);
}
