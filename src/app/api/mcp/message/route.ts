import { authenticateMcpRequest, unauthorizedResponse, MCP_CORS_HEADERS } from '@/lib/mcp/auth';
import { getSseSessions } from '@/lib/mcp/session-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  const authInfo = await authenticateMcpRequest(req);
  if (!authInfo) {
    return unauthorizedResponse();
  }

  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400, headers: MCP_CORS_HEADERS });
  }

  const session = getSseSessions().get(sessionId);
  if (!session) {
    return new Response('Session not found', { status: 404, headers: MCP_CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: MCP_CORS_HEADERS });
  }

  try {
    await session.transport.handleMessage(body, { authInfo });
  } catch {
    return new Response('Invalid message', { status: 400, headers: MCP_CORS_HEADERS });
  }

  return new Response('Accepted', { status: 202, headers: MCP_CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: MCP_CORS_HEADERS,
  });
}
