import { MCP_CORS_HEADERS } from '@/lib/mcp/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(
    JSON.stringify({
      error: 'Legacy MCP SSE is disabled. Use streamable HTTP at /api/mcp with a Firebase ID token in the Authorization Bearer header.',
    }),
    { status: 410, headers: { 'Content-Type': 'application/json', ...MCP_CORS_HEADERS } },
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: MCP_CORS_HEADERS,
  });
}
