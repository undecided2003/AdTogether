import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { adminAuth } from '@/lib/firebase-admin';

export async function authenticateMcpRequest(req: Request): Promise<AuthInfo | null> {
  const authorization = req.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  try {
    // App IDs are intentionally embedded in client applications, so they
    // cannot authorize account-level MCP operations. Verify a Firebase ID
    // token from an email-verified account and retain only a non-secret
    // account identifier in AuthInfo.
    const decoded = await adminAuth.verifyIdToken(match[1], true);
    if (decoded.email_verified !== true) return null;
    return { token: `firebase:${decoded.uid}`, clientId: decoded.uid, scopes: [] };
  } catch (error) {
    console.error('Error authenticating MCP request with Firebase:', error);
  }

  return null;
}

export function unauthorizedResponse(message?: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: message || 'Unauthorized: a valid Firebase ID token is required in the Authorization Bearer header.',
      },
      id: null,
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...MCP_CORS_HEADERS },
    }
  );
}

export const MCP_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, mcp-session-id, mcp-protocol-version, last-event-id, accept, x-requested-with',
  'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version, last-event-id',
  'Access-Control-Max-Age': '86400',
};
