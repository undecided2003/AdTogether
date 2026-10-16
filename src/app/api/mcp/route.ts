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
      return jsonRpcError(400, -32700, 'Parse error: Invalid JSON body');
    }

    // 1. Existing active stateful session
    if (sessionId && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId)!;
      const res = await transport.handleRequest(req, { authInfo, parsedBody });
      Object.entries(MCP_CORS_HEADERS).forEach(([k, v]) => {
        if (!res.headers.has(k)) res.headers.set(k, v);
      });
      return res;
    }

    // 2. New stateful session initialization
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
      const res = await transport.handleRequest(req, { authInfo, parsedBody });
      Object.entries(MCP_CORS_HEADERS).forEach(([k, v]) => {
        if (!res.headers.has(k)) res.headers.set(k, v);
      });
      return res;
    }

    // 3. Stateless request or serverless instance fallback
    // If the session was lost due to serverless scaling, or if the client operates statelessly
    try {
      const server = createAdTogetherMcpServer();
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      await server.connect(transport);
      const res = await transport.handleRequest(req, { authInfo, parsedBody });
      Object.entries(MCP_CORS_HEADERS).forEach(([k, v]) => {
        if (!res.headers.has(k)) res.headers.set(k, v);
      });
      return res;
    } catch (err: any) {
      if (sessionId) {
        return jsonRpcError(404, -32001, `Session expired or not found on this instance: ${sessionId}`);
      }
      return jsonRpcError(500, -32603, `Internal error processing MCP request: ${err?.message || String(err)}`);
    }
  }

  if (req.method === 'GET') {
    if (sessionId && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId)!;
      const res = await transport.handleRequest(req, { authInfo });
      Object.entries(MCP_CORS_HEADERS).forEach(([k, v]) => {
        if (!res.headers.has(k)) res.headers.set(k, v);
      });
      return res;
    }

    // Stateless GET request
    try {
      const server = createAdTogetherMcpServer();
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      const res = await transport.handleRequest(req, { authInfo });
      Object.entries(MCP_CORS_HEADERS).forEach(([k, v]) => {
        if (!res.headers.has(k)) res.headers.set(k, v);
      });
      return res;
    } catch {
      return new Response('Not Acceptable: Client must accept text/event-stream or provide valid session ID', {
        status: 400,
        headers: MCP_CORS_HEADERS,
      });
    }
  }

  if (req.method === 'DELETE') {
    if (!sessionId) {
      return new Response('Missing session ID', { status: 400, headers: MCP_CORS_HEADERS });
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return new Response('Session not found or already closed', { status: 200, headers: MCP_CORS_HEADERS });
    }
    const res = await session.transport.handleRequest(req, { authInfo });
    sessions.delete(sessionId);
    void session.server.close();
    Object.entries(MCP_CORS_HEADERS).forEach(([k, v]) => {
      if (!res.headers.has(k)) res.headers.set(k, v);
    });
    return res;
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
