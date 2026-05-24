import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createAdTogetherMcpServer } from '@/lib/mcp/create-server';
import { authenticateMcpRequest, unauthorizedResponse, MCP_CORS_HEADERS } from '@/lib/mcp/auth';
import { getStreamableSessions } from '@/lib/mcp/session-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function jsonRpcError(status: number, code: number, message: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code, message },
      id: null,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...MCP_CORS_HEADERS },
    }
  );
}

async function handleStreamableMcp(req: Request): Promise<Response> {
  const authInfo = await authenticateMcpRequest(req);
  if (!authInfo) {
    return unauthorizedResponse();
  }

  const sessions = getStreamableSessions();
  const sessionId = req.headers.get('mcp-session-id') ?? undefined;

  if (req.method === 'POST') {
    let parsedBody: unknown;
    try {
      parsedBody = await req.json();
    } catch {
      return jsonRpcError(400, -32000, 'Bad Request: Invalid JSON body');
    }

    if (sessionId && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId)!;
      return transport.handleRequest(req, { authInfo, parsedBody });
    }

    if (!sessionId && isInitializeRequest(parsedBody)) {
      const server = createAdTogetherMcpServer();
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sid) => {
          sessions.set(sid, { transport, server });
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) {
          sessions.delete(sid);
        }
        void server.close();
      };

      await server.connect(transport);
      return transport.handleRequest(req, { authInfo, parsedBody });
    }

    if (sessionId) {
      return jsonRpcError(404, -32001, 'Session not found');
    }

    return jsonRpcError(400, -32000, 'Bad Request: Mcp-Session-Id header is required');
  }

  if (req.method === 'GET') {
    if (!sessionId) {
      return new Response('Missing session ID', { status: 400, headers: MCP_CORS_HEADERS });
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return new Response('Session not found', { status: 404, headers: MCP_CORS_HEADERS });
    }
    return session.transport.handleRequest(req, { authInfo });
  }

  if (req.method === 'DELETE') {
    if (!sessionId) {
      return new Response('Missing session ID', { status: 400, headers: MCP_CORS_HEADERS });
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return new Response('Session not found', { status: 404, headers: MCP_CORS_HEADERS });
    }
    return session.transport.handleRequest(req, { authInfo });
  }

  return jsonRpcError(405, -32000, 'Method not allowed');
}

export async function GET(req: Request) {
  return handleStreamableMcp(req);
}

export async function POST(req: Request) {
  return handleStreamableMcp(req);
}

export async function DELETE(req: Request) {
  return handleStreamableMcp(req);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: MCP_CORS_HEADERS,
  });
}
