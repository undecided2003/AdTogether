import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Ensure we only create the server and transport once in development
const globalForMCP = global as unknown as { 
  mcpServer?: Server,
  mcpTransport?: WebStandardStreamableHTTPServerTransport 
};

let server: Server;
let transport: WebStandardStreamableHTTPServerTransport;

if (!globalForMCP.mcpServer) {
  server = new Server(
    {
      name: "adtogether-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  server.connect(transport);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_ad_together_documentation",
          description: "Get documentation for AdTogether SDK.",
          inputSchema: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                description: "The topic to get documentation for (e.g. 'getting-started', 'banners', 'interstitials')."
              }
            },
            required: ["topic"]
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_ad_together_documentation") {
      const args = request.params.arguments as any;
      const topic = args.topic;
      
      let content = `Documentation for ${topic} is not available yet.`;
      
      if (topic === "getting-started") {
        content = "To get started with AdTogether, initialize the SDK using AdTogether.initialize({ appId, bundleId }) in your app.";
      } else if (topic === "banners") {
        content = "Banner ads can be displayed using the AdTogetherBanner component. Make sure to provide a unitId.";
      } else if (topic === "interstitials") {
        content = "Interstitial ads cover the entire screen. Call showInterstitial() when the user reaches a natural stopping point.";
      }
      
      return {
        content: [
          {
            type: "text",
            text: content
          }
        ]
      };
    }
    
    throw new Error(`Tool not found: ${request.params.name}`);
  });

  globalForMCP.mcpServer = server;
  globalForMCP.mcpTransport = transport;
} else {
  server = globalForMCP.mcpServer;
  transport = globalForMCP.mcpTransport!;
}

export async function GET(req: Request) {
  return transport.handleRequest(req);
}

export async function POST(req: Request) {
  return transport.handleRequest(req);
}

export async function OPTIONS(req: Request) {
  // Setup CORS if needed for external client access
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
