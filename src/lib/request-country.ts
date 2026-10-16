import { isIP } from 'node:net';

type HeaderReader = Pick<Headers, 'get'>;

const trustedIngressHeaders = {
  firebase: {
    country: 'x-country-code',
    clientIp: 'x-forwarded-for',
  },
  vercel: {
    country: 'x-vercel-ip-country',
    // Vercel maintains this header even when a configured proxy replaces
    // x-forwarded-for.
    clientIp: 'x-vercel-forwarded-for',
  },
  cloudflare: {
    country: 'cf-ipcountry',
    clientIp: 'cf-connecting-ip',
  },
  appengine: {
    country: 'x-appengine-country',
    clientIp: 'x-appengine-user-ip',
  },
} as const;

function trustedIngress() {
  const provider = process.env.TRUSTED_GEO_PROVIDER || 'firebase';
  return trustedIngressHeaders[provider as keyof typeof trustedIngressHeaders] || null;
}

/**
 * Read country only from the explicitly configured trusted ingress.  Do not
 * fall back across providers: a request can carry arbitrary copies of another
 * provider's headers.
 */
export function getTrustedRequestCountry(requestHeaders: HeaderReader): string | null {
  const ingress = trustedIngress();
  if (!ingress) return null;

  const edgeCountry = requestHeaders.get(ingress.country);

  if (!edgeCountry) return null;

  const normalized = edgeCountry.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

/**
 * Return a client IP only from the explicitly configured ingress.  Generic
 * forwarding headers can be supplied by a direct caller, so they must never
 * key a fraud-control limit.
 */
export function getTrustedRequestIp(requestHeaders: HeaderReader): string | null {
  const ingress = trustedIngress();
  if (!ingress) return null;

  const raw = requestHeaders.get(ingress.clientIp)?.trim();
  if (!raw) return null;

  const candidate = raw.includes(',') ? raw.split(',')[0].trim() : raw;
  return candidate && isIP(candidate) !== 0 ? candidate : null;
}

