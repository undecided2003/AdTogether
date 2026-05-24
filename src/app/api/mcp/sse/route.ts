import { createAdTogetherMcpServer } from '@/lib/mcp/create-server';
import { authenticateMcpRequest, unauthorizedResponse, MCP_CORS_HEADERS } from '@/lib/mcp/auth';
import { LegacyWebSseTransport } from '@/lib/mcp/legacy-sse-transport';
import { getSseSessions } from '@/lib/mcp/session-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request) {
  const authInfo = await authenticateMcpRequest(req);
  if (!authInfo) {
    return unauthorizedResponse();
  }

  const url = new URL(req.url);
  const appId =
    url.searchParams.get('appId') ||
    url.searchParams.get('apiKey') ||
    authInfo.token;

  const messagePath = `/api/mcp/message?appId=${encodeURIComponent(appId)}`;
  const encoder = new TextEncoder();
  const sessions = getSseSessions();

  let transport: LegacyWebSseTransport | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const activeTransport = new LegacyWebSseTransport(messagePath);
      transport = activeTransport;
      activeTransport.attachWriter((chunk) => controller.enqueue(encoder.encode(chunk)));
      activeTransport.onclose = () => {
        sessions.delete(activeTransport.sessionId);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const server = createAdTogetherMcpServer();
      sessions.set(activeTransport.sessionId, { transport: activeTransport, server });
      await server.connect(transport);
    },
    cancel: async () => {
      if (transport) {
        await transport.close();
        const session = sessions.get(transport.sessionId);
        if (session) {
          await session.server.close();
          sessions.delete(transport.sessionId);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      ...MCP_CORS_HEADERS,
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: MCP_CORS_HEADERS,
  });
}
