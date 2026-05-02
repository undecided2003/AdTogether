import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { adminDb as db } from '@/lib/firebase-admin';

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
        },
        {
          name: "get_account_info",
          description: "Get the current user's account information including credits, total impressions, and total clicks.",
          inputSchema: {
            type: "object",
            properties: {},
          }
        },
        {
          name: "get_campaigns",
          description: "Get the user's current ad campaigns and their statuses.",
          inputSchema: {
            type: "object",
            properties: {},
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const userUid = extra?.authInfo?.clientId;
    if (!userUid) {
      throw new Error("Unauthorized: Invalid App ID.");
    }

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
        content: [{ type: "text", text: content }]
      };
    }
    
    if (request.params.name === "get_account_info") {
      const userRef = db.collection('users').doc(userUid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
         throw new Error("User not found.");
      }
      
      const userData = userDoc.data();
      const info = {
        credits: userData?.credits || 0,
        country: userData?.country || "Unknown",
        apiKeys: userData?.apiKeys || [],
        totalEarned: Object.values(userData?.earningsLog || {}).reduce((sum: number, e: any) => sum + (e.creditsEarned || 0), 0)
      };

      return {
        content: [{ type: "text", text: JSON.stringify(info, null, 2) }]
      };
    }

    if (request.params.name === "get_campaigns") {
      const q = db.collection('ads').where('ownerUid', '==', userUid);
      const snapshot = await q.get();
      
      const campaigns = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          active: data.active,
          impressions: data.impressions || 0,
          clicks: data.clicks || 0,
          adType: data.adType || 'banner'
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(campaigns, null, 2) }]
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

async function authenticate(req: Request) {
  const url = new URL(req.url);
  const apiKey = url.searchParams.get('apiKey') || req.headers.get('authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return null;
  }

  // Check if it matches an apiKey
  const pSnap = await db.collection('users').where('apiKey', '==', apiKey).limit(1).get();
  if (!pSnap.empty) {
    return { token: apiKey, clientId: pSnap.docs[0].id, scopes: [] };
  }
  
  // Check if it matches an apiKeys array
  const pSnapArr = await db.collection('users').where('apiKeys', 'array-contains', apiKey).limit(1).get();
  if (!pSnapArr.empty) {
    return { token: apiKey, clientId: pSnapArr.docs[0].id, scopes: [] };
  }
  
  return null;
}

export async function GET(req: Request) {
  const authInfo = await authenticate(req);
  if (!authInfo) {
    return new Response(JSON.stringify({ error: "Unauthorized: App ID is required via '?apiKey=' parameter or Bearer token." }), { 
      status: 401, 
      headers: { "Content-Type": "application/json" } 
    });
  }
  return transport.handleRequest(req, { authInfo });
}

export async function POST(req: Request) {
  const authInfo = await authenticate(req);
  if (!authInfo) {
    return new Response(JSON.stringify({ error: "Unauthorized: App ID is required via '?apiKey=' parameter or Bearer token." }), { 
      status: 401, 
      headers: { "Content-Type": "application/json" } 
    });
  }
  return transport.handleRequest(req, { authInfo });
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
