import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { adminDb as db } from '@/lib/firebase-admin';

export async function authenticateMcpRequest(req: Request): Promise<AuthInfo | null> {
  const url = new URL(req.url);
  const appId =
    url.searchParams.get('appId') ||
    url.searchParams.get('apiKey') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

  if (!appId) {
    return null;
  }

  const pSnap = await db.collection('users').where('appId', '==', appId).limit(1).get();
  if (!pSnap.empty) {
    return { token: appId, clientId: pSnap.docs[0].id, scopes: [] };
  }

  const pSnapArr = await db.collection('users').where('appIds', 'array-contains', appId).limit(1).get();
  if (!pSnapArr.empty) {
    return { token: appId, clientId: pSnapArr.docs[0].id, scopes: [] };
  }

  const legacySnap = await db.collection('users').where('apiKey', '==', appId).limit(1).get();
  if (!legacySnap.empty) {
    return { token: appId, clientId: legacySnap.docs[0].id, scopes: [] };
  }

  const legacySnapArr = await db.collection('users').where('apiKeys', 'array-contains', appId).limit(1).get();
  if (!legacySnapArr.empty) {
    return { token: appId, clientId: legacySnapArr.docs[0].id, scopes: [] };
  }

  return null;
}

export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "Unauthorized: App ID is required via '?appId=' parameter or Bearer token.",
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export const MCP_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id, Last-Event-ID',
};
