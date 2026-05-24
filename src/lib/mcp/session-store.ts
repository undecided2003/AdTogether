import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { LegacyWebSseTransport } from '@/lib/mcp/legacy-sse-transport';

type StreamableSession = {
  transport: WebStandardStreamableHTTPServerTransport;
  server: Server;
};

type SseSession = {
  transport: LegacyWebSseTransport;
  server: Server;
};

const globalForMCP = globalThis as typeof globalThis & {
  __adtogetherStreamableSessions?: Map<string, StreamableSession>;
  __adtogetherSseSessions?: Map<string, SseSession>;
};

export function getStreamableSessions(): Map<string, StreamableSession> {
  if (!globalForMCP.__adtogetherStreamableSessions) {
    globalForMCP.__adtogetherStreamableSessions = new Map();
  }
  return globalForMCP.__adtogetherStreamableSessions;
}

export function getSseSessions(): Map<string, SseSession> {
  if (!globalForMCP.__adtogetherSseSessions) {
    globalForMCP.__adtogetherSseSessions = new Map();
  }
  return globalForMCP.__adtogetherSseSessions;
}
