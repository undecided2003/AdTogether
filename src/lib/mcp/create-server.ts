import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { adminDb as db } from '@/lib/firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

export function createAdTogetherMcpServer(): Server {
  const server = new Server(
    {
      name: "adtogether-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "file:///docs/SDK_SECURITY_INVARIANTS.md",
          name: "SDK Security Invariants",
          mimeType: "text/markdown",
          description: "Defines architecture and security constraints for the SDK"
        },
        {
          uri: "file:///AD_CONTENT_POLICY.md",
          name: "Ad Content Policy",
          mimeType: "text/markdown",
          description: "Defines prohibited content categories for ad submissions"
        },
        {
          uri: "file:///sdk/web-sdk/README.md",
          name: "Web SDK Integration Guide",
          mimeType: "text/markdown",
          description: "Integration guide for the AdTogether Web SDK"
        },
        {
          uri: "file:///sdk/react-native-sdk/README.md",
          name: "React Native SDK Integration Guide",
          mimeType: "text/markdown",
          description: "Integration guide for the AdTogether React Native SDK"
        },
        {
          uri: "file:///sdk/android-sdk/README.md",
          name: "Android SDK Integration Guide",
          mimeType: "text/markdown",
          description: "Integration guide for the AdTogether Android SDK"
        },
        {
          uri: "file:///sdk/ios-sdk/README.md",
          name: "iOS SDK Integration Guide",
          mimeType: "text/markdown",
          description: "Integration guide for the AdTogether iOS SDK"
        },
        {
          uri: "file:///sdk/adtogether_sdk/README.md",
          name: "Flutter SDK Integration Guide",
          mimeType: "text/markdown",
          description: "Integration guide for the AdTogether Flutter SDK"
        }
      ]
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    
    // Map URI to actual file path
    let relativePath = "";
    if (uri === "file:///docs/SDK_SECURITY_INVARIANTS.md") {
      relativePath = "docs/SDK_SECURITY_INVARIANTS.md";
    } else if (uri === "file:///AD_CONTENT_POLICY.md") {
      relativePath = "AD_CONTENT_POLICY.md";
    } else if (uri.startsWith("file:///sdk/")) {
      relativePath = uri.replace("file:///", "");
    } else {
      throw new Error(`Resource not found: ${uri}`);
    }

    try {
      // In Next.js App Router, process.cwd() is the root of the project
      const filePath = path.join(process.cwd(), relativePath);
      const content = fs.readFileSync(filePath, 'utf8');
      
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/markdown",
            text: content
          }
        ]
      };
    } catch (e) {
      throw new Error(`Failed to read resource: ${relativePath}`);
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: "integrate-ads",
          description: "A guided flow to generate and validate AdTogether ad snippets",
          arguments: [
            {
              name: "framework",
              description: "The frontend framework (e.g., react, react-native, android, ios, flutter)",
              required: true
            },
            {
              name: "adType",
              description: "The type of ad to integrate (banner or interstitial)",
              required: true
            },
            {
              name: "adUnitId",
              description: "The AdTogether ad unit ID for this placement (e.g. 'home_banner')",
              required: true
            }
          ]
        },
        {
          name: "troubleshoot",
          description: "A diagnostic prompt that walks through common integration issues step by step",
          arguments: [
            {
              name: "issue",
              description: "A brief description of the issue (e.g., 'no fill', 'compile error')",
              required: false
            }
          ]
        }
      ]
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "integrate-ads") {
      const framework = args?.framework || "unknown";
      const adType = args?.adType || "unknown";
      const unitId = args?.adUnitId || args?.unitId || "unknown";
      
      return {
        description: "Ad Integration Flow",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I want to integrate an AdTogether ad. \nFramework: ${framework}\nAd Type: ${adType}\nAd Unit ID: ${unitId}\n\nPlease generate the required ad snippet for this configuration, and then validate the generated code using the validate_ad_component tool to ensure it meets SDK security invariants.`
            }
          }
        ]
      };
    }

    if (name === "troubleshoot") {
      const issue = args?.issue || "unknown issue";
      return {
        description: "Troubleshooting Guide",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I'm having trouble with my AdTogether integration. The issue I'm facing is: ${issue}\n\nPlease help me diagnose this step-by-step:\n1. Check if the SDK is initialized.\n2. Verify the unit ID format.\n3. Run diagnose_no_fill if the issue is related to ads not showing.\n4. Check the account status and recent SDK errors.\nPlease walk me through each step and ask for my logs or code if needed.`
            }
          }
        ]
      };
    }

    throw new Error(`Prompt not found: ${name}`);
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_account_status",
          description: "Fetch the current ad credit balance, total spent, and account health.",
          inputSchema: {
            type: "object",
            properties: {},
          }
        },
        {
          name: "get_app_config",
          description: "Retrieve the appId, bundleId, and authorized domains for a specific project.",
          inputSchema: {
            type: "object",
            properties: {},
          }
        },
        {
          name: "list_campaigns",
          description: "Retrieve active/paused campaigns along with their core metrics.",
          inputSchema: {
            type: "object",
            properties: {},
          }
        },
        {
          name: "get_campaign_rejection_reason",
          description: "Get the specific AD_CONTENT_POLICY.md violation for a flagged campaign.",
          inputSchema: {
            type: "object",
            properties: {
              campaignId: {
                type: "string",
                description: "The ID of the campaign to check."
              }
            },
            required: ["campaignId"]
          }
        },
        {
          name: "draft_campaign",
          description: "Programmatically submit a draft ad to the AdTogether dashboard.",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              targetUrl: { type: "string" },
              adType: { type: "string" },
              description: { type: "string" },
              imageBase64: { type: "string" }
            },
            required: ["title", "targetUrl", "adType", "description"]
          }
        },
        {
          name: "get_recent_sdk_errors",
          description: "Fetch the last 24 hours of integration errors for a specific App ID.",
          inputSchema: {
            type: "object",
            properties: {},
          }
        },
        {
          name: "simulate_ad_request",
          description: "Send a mock ad request with the user's configuration to see if it would be fulfilled.",
          inputSchema: {
            type: "object",
            properties: {
              unitId: { type: "string" },
              adType: { type: "string" }
            },
            required: ["unitId", "adType"]
          }
        },
        {
          name: "screen_ad_content",
          description: "Verify if an ad passes safety policies before uploading.",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              targetUrl: { type: "string" }
            },
            required: ["title", "description", "targetUrl"]
          }
        },
        {
          name: "generate_integration_snippet",
          description: "Generate boilerplate integration code for AdTogether SDK components.",
          inputSchema: {
            type: "object",
            properties: {
              adType: {
                type: "string",
                description: "The type of ad unit (e.g. 'banner' or 'interstitial')."
              },
              framework: {
                type: "string",
                description: "The framework being used (e.g. 'nextjs', 'react')."
              }
            },
            required: ["adType", "framework"]
          }
        },
        {
          name: "validate_ad_component",
          description: "Check user-provided component code against SDK_SECURITY_INVARIANTS.md.",
          inputSchema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The source code of the component to validate."
              }
            },
            required: ["code"]
          }
        },
        {
          name: "diagnose_no_fill",
          description: "Diagnose why ads are not showing. Runs a comprehensive check across account credits, bundle ID, authorized domains, campaign inventory, and recent SDK errors to identify the root cause.",
          inputSchema: {
            type: "object",
            properties: {
              unitId: {
                type: "string",
                description: "The ad unit ID that is failing to fill (optional)."
              },
              bundleId: {
                type: "string",
                description: "The bundle ID configured in the user's app (optional, for mismatch detection)."
              },
              domain: {
                type: "string",
                description: "The domain the ad is being served from (optional, for web apps)."
              }
            }
          }
        },
        {
          name: "check_sdk_version",
          description: "Compare the user's installed AdTogether SDK version against the latest published version. Returns whether an upgrade is needed, what changed, and platform-specific upgrade instructions.",
          inputSchema: {
            type: "object",
            properties: {
              platform: {
                type: "string",
                description: "The SDK platform: 'web', 'react-native', 'android', or 'flutter'."
              },
              currentVersion: {
                type: "string",
                description: "The user's currently installed SDK version (e.g. '0.2.4')."
              }
            },
            required: ["platform", "currentVersion"]
          }
        },
        {
          name: "get_revenue_breakdown",
          description: "Get a structured revenue breakdown by ad type (banner vs interstitial), time period, and campaign. Answers questions like 'how much did I earn from banners this week?'",
          inputSchema: {
            type: "object",
            properties: {
              period: {
                type: "string",
                description: "Time period to filter: 'today', '7d', '30d', or 'all'. Defaults to '30d'."
              }
            }
          }
        },
        {
          name: "migrate_from_admob",
          description: "A guided migration tool. The user provides their current AdMob component code, and the tool returns the equivalent AdTogether implementation. This is a huge developer acquisition lever.",
          inputSchema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The user's current AdMob implementation code."
              }
            },
            required: ["code"]
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


    if (request.params.name === "get_account_status") {
      const userRef = db.collection('users').doc(userUid);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
         throw new Error("User not found.");
      }
      
      const userData = userDoc.data();
      const info = {
        credits: userData?.credits || 0,
        country: userData?.country || "Unknown",
        appId: userData?.appIds?.[0] || 'Unknown',
        totalEarned: Object.values(userData?.earningsLog || {}).reduce((sum: number, e: any) => sum + (e.creditsEarned || 0), 0)
      };

      return {
        content: [{ type: "text", text: JSON.stringify(info, null, 2) }]
      };
    }

    if (request.params.name === "get_app_config") {
      const userRef = db.collection('users').doc(userUid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) throw new Error("User not found.");
      const data = userDoc.data();
      const config = {
        appId: data?.appIds?.[0] || 'Unknown',
        bundleId: data?.bundleId || 'com.example.app',
        authorizedDomains: data?.authorizedDomains || []
      };
      return {
        content: [{ type: "text", text: JSON.stringify(config, null, 2) }]
      };
    }

    if (request.params.name === "list_campaigns") {
      const q = db.collection('ads').where('ownerUid', '==', userUid);
      const snapshot = await q.get();
      
      const campaigns = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          active: data.active,
          impressions: data.impressions || 0,
          clicks: data.clicks || 0,
          adType: data.adType || 'banner',
          status: data.status || (data.active ? 'active' : 'paused')
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(campaigns, null, 2) }]
      };
    }

    if (request.params.name === "get_campaign_rejection_reason") {
      const args = request.params.arguments as any;
      const adDoc = await db.collection('ads').doc(args.campaignId).get();
      if (!adDoc.exists || adDoc.data()?.ownerUid !== userUid) {
        throw new Error("Campaign not found or unauthorized.");
      }
      const data = adDoc.data();
      const reason = data?.rejectionReason || "No rejection reason found. The campaign may not be rejected.";
      return {
        content: [{ type: "text", text: reason }]
      };
    }

    if (request.params.name === "draft_campaign") {
      const args = request.params.arguments as any;
      const newAdRef = db.collection('ads').doc();
      await newAdRef.set({
        title: args.title,
        targetUrl: args.targetUrl,
        adType: args.adType,
        description: args.description,
        ownerUid: userUid,
        status: 'draft',
        active: false,
        createdAt: new Date().toISOString()
      });
      return {
        content: [{ type: "text", text: `Draft campaign created with ID: ${newAdRef.id}` }]
      };
    }

    if (request.params.name === "get_recent_sdk_errors") {
      const errorsSnap = await db.collection('sdkErrors')
        .where('uid', '==', userUid)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()
        .catch(() => null);

      if (!errorsSnap || errorsSnap.empty) {
        return {
          content: [{ type: "text", text: "No recent SDK errors found for this account." }]
        };
      }

      const errors = errorsSnap.docs.map((d: any) => {
        const data = d.data();
        return {
          timestamp: data.timestamp?.toDate?.()?.toISOString?.() || 'unknown',
          error: data.message || data.error || 'Unknown error',
          code: data.code || 'unknown'
        };
      });
      return {
        content: [{ type: "text", text: JSON.stringify(errors, null, 2) }]
      };
    }

    if (request.params.name === "simulate_ad_request") {
      const args = request.params.arguments as any;
      const simChecks: string[] = [];
      let wouldFill = true;

      // Check credits
      const userDoc = await db.collection('users').doc(userUid).get();
      const credits = userDoc.data()?.credits || 0;
      if (credits <= 0) {
        simChecks.push(`❌ Credits: ${credits} (need > 0 for ads to serve)`);
        wouldFill = false;
      } else {
        simChecks.push(`✅ Credits: ${credits}`);
      }

      // Validate adType
      const validTypes = ['banner', 'interstitial'];
      if (args.adType && !validTypes.includes(args.adType)) {
        simChecks.push(`❌ Invalid adType "${args.adType}". Must be one of: ${validTypes.join(', ')}`);
        wouldFill = false;
      } else {
        simChecks.push(`✅ Ad type: ${args.adType || 'banner'}`);
      }

      // Check for active campaigns
      const campaignSnap = await db.collection('ads').where('active', '==', true).limit(1).get();
      if (campaignSnap.empty) {
        simChecks.push('❌ No active campaigns in the network to fill from');
        wouldFill = false;
      } else {
        simChecks.push('✅ Active campaigns available in network');
      }

      const result = wouldFill
        ? `✅ Simulation PASSED — ad request for unit "${args.unitId || 'default'}" (${args.adType || 'banner'}) would be fulfilled.\n\n${simChecks.join('\n')}`
        : `❌ Simulation FAILED — ad request would NOT fill.\n\n${simChecks.join('\n')}`;

      return {
        content: [{ type: "text", text: result }]
      };
    }

    if (request.params.name === "screen_ad_content") {
      const args = request.params.arguments as any;
      // In a real scenario, this would call the DeepSeek API or /api/screen logic
      // We simulate a basic check here.
      let isSafe = true;
      let reason = "Content looks good.";
      if (args.title?.toLowerCase().includes("scam") || args.description?.toLowerCase().includes("scam")) {
         isSafe = false;
         reason = "Violates AD_CONTENT_POLICY.md: Misleading or scam content detected.";
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ isSafe, reason }, null, 2) }]
      };
    }

    if (request.params.name === "generate_integration_snippet") {
      const args = request.params.arguments as any;
      const { adType, framework } = args;
      
      let snippet = "";
      if (framework === "nextjs" || framework === "react") {
        if (adType === "banner") {
          snippet = `"use client";
import { useEffect } from 'react';
import { AdTogether } from '@adtogether/web-sdk';
import { AdTogetherBanner } from '@adtogether/web-sdk/react';

export default function MyAdComponent() {
  useEffect(() => {
    AdTogether.initialize({ appId: 'YOUR_APP_ID' });
  }, []);

  return (
    <div>
      <AdTogetherBanner 
        adUnitId="example_banner"
        showCloseButton={true}
        onAdLoaded={() => console.log('Ad loaded!')}
        onAdFailedToLoad={(e) => console.error(e)}
        onAdClosed={() => console.log('Banner closed')}
      />
    </div>
  );
}`;
        } else if (adType === "interstitial") {
          snippet = `"use client";
import { useEffect, useState } from 'react';
import { AdTogether } from '@adtogether/web-sdk';
import { AdTogetherInterstitial } from '@adtogether/web-sdk/react';

export default function MyInterstitialComponent() {
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    AdTogether.initialize({ appId: 'YOUR_APP_ID' });
  }, []);

  return (
    <div>
      <button onClick={() => setShowAd(true)}>Show Interstitial</button>
      <AdTogetherInterstitial
        adUnitId="example_interstitial"
        isOpen={showAd}
        onClose={() => setShowAd(false)}
        closeDelay={3}
        onAdLoaded={() => console.log('Ad loaded!')}
        onAdFailedToLoad={(e) => console.error(e)}
      />
    </div>
  );
}`;
        }
      } else if (framework === "android" || framework === "kotlin") {
        if (adType === "banner") {
          snippet = `import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.adtogether.sdk.AdTogether
import com.adtogether.sdk.views.AdTogetherBanner

// Initialize in your Application class:
// AdTogether.initialize(context = this, appId = "YOUR_APP_ID")

@Composable
fun BannerExample() {
    Column(modifier = Modifier.fillMaxSize()) {
        // Your content here
        Spacer(modifier = Modifier.weight(1f))

        AdTogetherBanner(
            adUnitId = "example_banner",
            showCloseButton = true,
            onAdLoaded = { println("Ad loaded!") },
            onAdClosed = { println("Banner closed!") },
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp)
        )
    }
}`;
        } else if (adType === "interstitial") {
          snippet = `import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import com.adtogether.sdk.AdTogether
import com.adtogether.sdk.views.AdTogetherInterstitial

// Initialize in your Application class:
// AdTogether.initialize(context = this, appId = "YOUR_APP_ID")

@Composable
fun InterstitialExample() {
    var showAd by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        Button(onClick = { showAd = true }) {
            Text("Show Interstitial")
        }

        if (showAd) {
            AdTogetherInterstitial(
                adUnitId = "example_interstitial",
                onAdLoaded = { println("Ad loaded!") },
                onDismiss = { showAd = false }
            )
        }
    }
}`;
        }
      } else if (framework === "flutter" || framework === "dart") {
        if (adType === "banner") {
          snippet = `import 'package:flutter/material.dart';
import 'package:adtogether_sdk/adtogether_sdk.dart';

// Initialize before runApp():
// await AdTogether.initialize(appId: 'YOUR_APP_ID');

class BannerExample extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // Your content here
          const Spacer(),

          AdTogetherBanner(
            adUnitId: 'example_banner',
            showCloseButton: true,
            size: AdSize.banner,
            onAdLoaded: () => debugPrint('Ad loaded!'),
            onAdFailedToLoad: (error) => debugPrint('Error: \$error'),
            onAdClosed: () => debugPrint('Banner closed!'),
          ),
        ],
      ),
    );
  }
}`;
        } else if (adType === "interstitial") {
          snippet = `import 'package:flutter/material.dart';
import 'package:adtogether_sdk/adtogether_sdk.dart';

// Initialize before runApp():
// await AdTogether.initialize(appId: 'YOUR_APP_ID');

class InterstitialExample extends StatelessWidget {
  void _showAdBreak(BuildContext context) {
    AdTogetherInterstitial.show(
      context: context,
      adUnitId: 'example_interstitial',
      closeDelay: const Duration(seconds: 3),
      onAdLoaded: () => debugPrint('Interstitial ready'),
      onAdFailedToLoad: (error) => debugPrint('Error: \$error'),
      onAdClosed: () => debugPrint('User closed ad'),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ElevatedButton(
          onPressed: () => _showAdBreak(context),
          child: const Text('Show Interstitial'),
        ),
      ),
    );
  }
}`;
        }
      } else if (framework === "ios" || framework === "swift") {
        if (adType === "banner") {
          snippet = `import SwiftUI
import AdTogether

// Initialize in your App init:
// AdTogether.initialize(appId: "YOUR_APP_ID")

struct BannerExample: View {
    var body: some View {
        VStack {
            Text("My App Content")

            Spacer()

            AdTogetherView(
                adUnitId: "example_banner",
                showCloseButton: true,
                onAdLoaded: { print("Ad loaded!") },
                onAdFailedToLoad: { error in print("Error: \\(error)") },
                onAdClosed: { print("Banner closed!") }
            )
            .frame(height: 50)
        }
    }
}`;
        } else if (adType === "interstitial") {
          snippet = `import SwiftUI
import AdTogether

// Initialize in your App init:
// AdTogether.initialize(appId: "YOUR_APP_ID")

struct InterstitialExample: View {
    @State private var showAd = false

    var body: some View {
        VStack {
            Button("Show Interstitial") {
                showAd = true
            }
        }
        .fullScreenCover(isPresented: $showAd) {
            AdTogetherInterstitialView(
                adUnitId: "example_interstitial",
                closeDelay: 3,
                onAdLoaded: { print("Ad loaded!") },
                onAdFailedToLoad: { error in print("Error: \\(error)") }
            ) { showAd = false }
        }
    }
}`;
        }
      }

      if (!snippet) {
         snippet = "// Snippet not available for this framework or adType.";
      }

      return {
        content: [{ type: "text", text: snippet }]
      };
    }

    if (request.params.name === "validate_ad_component") {
      const args = request.params.arguments as any;
      const code = args.code;
      
      const issues = [];
      
      // Web Checks — real SDK uses AdTogetherBanner and AdTogetherInterstitial from @adtogether/web-sdk/react
      const isWebBanner = code.includes("AdTogetherBanner") && !code.includes("AdTogetherBannerView") && !code.includes("AdTogetherInterstitial");
      const isWebInterstitial = code.includes("AdTogetherInterstitial") && (code.includes("isOpen") || code.includes("onClose"));
      
      // Check for phantom/deprecated APIs that don't exist
      if (code.includes("useInterstitial")) {
        issues.push("API ERROR: 'useInterstitial' hook does not exist in the Web SDK. Use the <AdTogetherInterstitial> component with isOpen/onClose props instead.");
      }
      if (code.includes("AdTogetherBannerWidget")) {
        issues.push("API ERROR: 'AdTogetherBannerWidget' does not exist in the Flutter SDK. Use 'AdTogetherBanner' instead.");
      }
      if (code.includes("apiKey:")) {
        issues.push("DEPRECATION WARNING: 'apiKey' is deprecated as of version 0.4.0. Use 'appId' instead to align with the AdTogether dashboard.");
      }
      if (code.includes("unitId=") && !code.includes("adUnitId=") && (code.includes("AdTogetherBanner") || code.includes("AdTogetherInterstitial"))) {
        issues.push("PROP ERROR: The correct prop name is 'adUnitId', not 'unitId'. Using 'unitId' will silently default to 'default'.");
      }
      
      // Check for wrong import path (web)
      if (code.includes("AdTogetherBanner") && code.includes("from '@adtogether/web-sdk'") && !code.includes("from '@adtogether/web-sdk/react'")) {
        issues.push("IMPORT ERROR: React components must be imported from '@adtogether/web-sdk/react', not '@adtogether/web-sdk'. Example: import { AdTogetherBanner } from '@adtogether/web-sdk/react';");
      }

      // Android Checks — real SDK uses AdTogetherBanner composable from com.adtogether.sdk.views
      const isAndroidBanner = code.includes("AdTogetherBanner") && (code.includes("import com.adtogether") || code.includes("@Composable"));
      const usesAndroidInterstitial = code.includes("AdTogetherInterstitial") && code.includes("onDismiss");
      
      // iOS / Swift Checks — real SDK uses AdTogetherView and AdTogetherInterstitialView
      const isIosBanner = code.includes("AdTogetherView") && (code.includes("import SwiftUI") || code.includes("import AdTogether"));
      const usesIosInterstitial = code.includes("AdTogetherInterstitialView") && code.includes("fullScreenCover");

      // Flutter Checks — real SDK uses AdTogetherBanner widget and AdTogetherInterstitial.show()
      const isFlutterBanner = code.includes("AdTogetherBanner(") && code.includes("adtogether_sdk");
      const usesFlutterInterstitial = code.includes("AdTogetherInterstitial.show(");

      const isBanner = isWebBanner || isAndroidBanner || isFlutterBanner || isIosBanner;
      const usesInterstitial = isWebInterstitial || usesAndroidInterstitial || usesFlutterInterstitial || usesIosInterstitial;
      
      // Edge Case: Fetching Interstitial within a Banner's lifecycle callback
      const isFetchingInterstitialInBannerCb = (code.match(/onAdClosed[\s\S]*?AdTogetherInterstitial/i)) || (code.match(/onAdLoaded[\s\S]*?AdTogetherInterstitial/i));

      if (isFetchingInterstitialInBannerCb) {
        issues.push("EDGE CASE VIOLATION: Loading or showing an interstitial ad inside a banner callback (like onAdClosed or onAdLoaded) is strictly prohibited as it triggers false impression metrics and lifecycle race conditions.");
      } else if (isBanner && usesInterstitial) {
        issues.push("SDK INVARIANT VIOLATION: Banner components must never accidentally fetch or render interstitial ads. This causes payout fraud.");
      }
      
      if ((isBanner || usesInterstitial) && !code.includes("AdTogether.initialize")) {
         issues.push("WARNING: Component is missing AdTogether.initialize(). Please ensure SDK initialization happens before rendering ads (or ensure it happens at app startup).");
      }

      // Edge case: Hardcoded test IDs accidentally pushed to production code
      if (code.includes("test_banner_id") || code.includes("test_interstitial_id") || code.includes("ca-app-pub-3940256099942544")) {
         issues.push("EDGE CASE WARNING: Test Unit IDs detected. Make sure to replace these with your actual production Unit IDs before shipping, or you will not receive revenue.");
      }

      const isValid = issues.length === 0;
      const report = isValid 
        ? "✅ Code is valid and adheres to SDK security invariants." 
        : `❌ Validation Failed:\n- ${issues.join('\n- ')}`;

      return {
        content: [{ type: "text", text: report }]
      };
    }

    if (request.params.name === "diagnose_no_fill") {
      const args = (request.params.arguments || {}) as any;
      const checks: { check: string; status: string; detail: string }[] = [];

      // 1. Account & Credits Check
      const userRef = db.collection('users').doc(userUid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return {
          content: [{ type: "text", text: "❌ CRITICAL: User account not found. The App ID may be invalid or the account may have been deleted." }]
        };
      }
      const userData = userDoc.data()!;
      const credits = userData.credits || 0;
      if (credits <= 0) {
        checks.push({ check: "Account Credits", status: "❌ FAIL", detail: `Credit balance is ${credits}. Ads will not serve without a positive balance. Top up credits in the AdTogether dashboard.` });
      } else {
        checks.push({ check: "Account Credits", status: "✅ PASS", detail: `Balance: ${credits} credits.` });
      }

      // 2. Bundle ID Mismatch Check
      const registeredBundleId = userData.bundleId || null;
      if (args.bundleId && registeredBundleId) {
        if (args.bundleId !== registeredBundleId) {
          checks.push({ check: "Bundle ID", status: "❌ FAIL", detail: `Mismatch detected. App is using "${args.bundleId}" but dashboard has "${registeredBundleId}". Update your dashboard or your SDK initialization code.` });
        } else {
          checks.push({ check: "Bundle ID", status: "✅ PASS", detail: `Matches: "${registeredBundleId}".` });
        }
      } else if (!registeredBundleId) {
        checks.push({ check: "Bundle ID", status: "⚠️ WARN", detail: "No bundle ID registered in the dashboard. This may cause ad requests to be rejected." });
      } else {
        checks.push({ check: "Bundle ID", status: "ℹ️ SKIPPED", detail: "No bundleId provided for comparison. Pass your app's bundleId to enable mismatch detection." });
      }

      // 3. Authorized Domains Check (for web)
      const authorizedDomains: string[] = userData.authorizedDomains || [];
      if (args.domain) {
        if (authorizedDomains.length === 0) {
          checks.push({ check: "Authorized Domains", status: "⚠️ WARN", detail: "No authorized domains configured. Web ads may be blocked. Add your domain in the dashboard." });
        } else if (!authorizedDomains.includes(args.domain)) {
          checks.push({ check: "Authorized Domains", status: "❌ FAIL", detail: `Domain "${args.domain}" is not in the authorized list: [${authorizedDomains.join(', ')}]. Add it in the dashboard.` });
        } else {
          checks.push({ check: "Authorized Domains", status: "✅ PASS", detail: `Domain "${args.domain}" is authorized.` });
        }
      } else {
        checks.push({ check: "Authorized Domains", status: "ℹ️ SKIPPED", detail: "No domain provided. Pass your serving domain to enable this check (web apps only)." });
      }

      // 4. Campaign Inventory Check
      const campaignSnap = await db.collection('ads').where('ownerUid', '==', userUid).where('active', '==', true).get();
      if (campaignSnap.empty) {
        checks.push({ check: "Active Campaigns", status: "❌ FAIL", detail: "No active campaigns found. You need at least one active campaign for ads to fill. Create or activate a campaign in the dashboard." });
      } else {
        const campaignSummary = campaignSnap.docs.map((d: any) => {
          const data = d.data();
          return `${d.id} (${data.adType || 'banner'}, ${data.impressions || 0} impressions)`;
        });
        checks.push({ check: "Active Campaigns", status: "✅ PASS", detail: `${campaignSnap.size} active campaign(s): ${campaignSummary.join('; ')}.` });

        // 4b. Unit ID match check
        if (args.unitId) {
          const matchingCampaign = campaignSnap.docs.find((d: any) => d.data().unitId === args.unitId);
          if (!matchingCampaign) {
            checks.push({ check: "Unit ID Match", status: "⚠️ WARN", detail: `No active campaign is targeting unit ID "${args.unitId}". Your active campaigns may use different unit IDs.` });
          } else {
            checks.push({ check: "Unit ID Match", status: "✅ PASS", detail: `Campaign "${matchingCampaign.id}" is targeting unit ID "${args.unitId}".` });
          }
        }
      }

      // 5. Recent SDK Errors Check
      const errorsSnap = await db.collection('sdkErrors')
        .where('uid', '==', userUid)
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get()
        .catch(() => null);

      if (errorsSnap && !errorsSnap.empty) {
        const recentErrors = errorsSnap.docs.map((d: any) => {
          const data = d.data();
          return `[${data.code}] ${data.message} (${data.timestamp?.toDate?.()?.toISOString?.() || 'unknown time'})`;
        });
        checks.push({ check: "Recent SDK Errors", status: "⚠️ WARN", detail: `${errorsSnap.size} recent error(s):\n  - ${recentErrors.join('\n  - ')}` });
      } else {
        checks.push({ check: "Recent SDK Errors", status: "✅ PASS", detail: "No recent SDK errors found." });
      }

      // Build final report
      const hasFailures = checks.some(c => c.status.includes("FAIL"));
      const hasWarnings = checks.some(c => c.status.includes("WARN"));
      let header = "";
      if (hasFailures) {
        header = "❌ DIAGNOSIS: Issues found that are preventing ad fill.\n";
      } else if (hasWarnings) {
        header = "⚠️ DIAGNOSIS: No blocking issues, but warnings detected. Review below.\n";
      } else {
        header = "✅ DIAGNOSIS: All checks passed. If ads still aren't filling, this may be a temporary inventory gap. Try again in a few minutes.\n";
      }

      const report = header + "\n" + checks.map(c => `${c.status} ${c.check}\n   ${c.detail}`).join("\n\n");

      return {
        content: [{ type: "text", text: report }]
      };
    }

    if (request.params.name === "check_sdk_version") {
      const args = request.params.arguments as any;
      const { platform, currentVersion } = args;

      const latestVersions: Record<string, { version: string; changelog: string; upgradeCmd: string }> = {
        'web': {
          version: '0.4.5',
          changelog: '0.4.5: Sync: Version parity across all AdTogether SDKs.\n0.4.3: Added SSR support for Next.js.\n0.4.0: Standardized appId as primary identifier, deprecated apiKey.',
          upgradeCmd: 'npm install @adtogether/web-sdk@latest'
        },
        'react-native': {
          version: '0.4.5',
          changelog: '0.4.5: Sync: Version parity across all AdTogether SDKs.\n0.4.3: Fixed Android lifecycle crash on orientation change.\n0.4.0: Standardized appId as primary identifier, deprecated apiKey.',
          upgradeCmd: 'npm install @adtogether/react-native-sdk@latest'
        },
        'android': {
          version: '0.4.5',
          changelog: '0.4.5: Sync: Version parity across all AdTogether SDKs.\n0.4.3: Standardized groupId to com.relaxsoftwareapps.adtogether.\n0.4.0: Standardized appId as primary identifier, deprecated apiKey.',
          upgradeCmd: "Update your build.gradle.kts:\nimplementation(\"com.relaxsoftwareapps.adtogether:sdk:0.4.5\")"
        },
        'flutter': {
          version: '0.4.5',
          changelog: '0.4.5: Removed package_info_plus and http dependencies to fix pub.dev analysis bug.\n0.4.0: Standardized appId as primary identifier, deprecated apiKey.',
          upgradeCmd: "Update your pubspec.yaml:\nadtogether_sdk: ^0.4.5\nThen run: flutter pub get"
        },
        'ios': {
          version: '0.4.5',
          changelog: '0.4.5: Sync: Version parity across all AdTogether SDKs.\n0.4.3: Improved Swift concurrency support.\n0.4.0: Standardized appId as primary identifier, deprecated apiKey.',
          upgradeCmd: "Update your Podfile:\npod 'AdTogether', '~> 0.4.5'\nThen run: pod update"
        }
      };

      const sdkInfo = latestVersions[platform];
      if (!sdkInfo) {
        return {
          content: [{ type: "text", text: `Unknown platform "${platform}". Supported: web, react-native, android, flutter.` }]
        };
      }

      const isUpToDate = currentVersion === sdkInfo.version;
      const currentParts = currentVersion.split('.').map(Number);
      const latestParts = sdkInfo.version.split('.').map(Number);
      const isMajorBehind = latestParts[0] > currentParts[0];
      const isMinorBehind = latestParts[1] > currentParts[1];

      let report = '';
      if (isUpToDate) {
        report = `\u2705 You are on the latest version (${sdkInfo.version}) of the ${platform} SDK. No action needed.`;
      } else {
        const severity = isMajorBehind ? '\u274c CRITICAL' : isMinorBehind ? '\u26a0\ufe0f IMPORTANT' : '\u2139\ufe0f MINOR';
        report = `${severity}: Your ${platform} SDK is outdated.\n\n`;
        report += `Installed: ${currentVersion}\n`;
        report += `Latest:    ${sdkInfo.version}\n\n`;
        report += `\ud83d\udcdd Changelog:\n${sdkInfo.changelog}\n\n`;
        report += `\ud83d\udce6 Upgrade:\n${sdkInfo.upgradeCmd}`;
      }

      return {
        content: [{ type: "text", text: report }]
      };
    }

    if (request.params.name === "get_revenue_breakdown") {
      const args = (request.params.arguments || {}) as any;
      const period = args.period || '30d';

      const userRef = db.collection('users').doc(userUid);
      const userDoc = await userRef.get();
      if (!userDoc.exists) throw new Error("User not found.");

      const userData = userDoc.data()!;
      const earningsLog: Record<string, any> = userData.earningsLog || {};

      // Determine date cutoff
      const now = new Date();
      let cutoff = new Date(0); // 'all' — no cutoff
      if (period === 'today') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === '7d') {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === '30d') {
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      let totalEarned = 0;
      let bannerEarned = 0;
      let interstitialEarned = 0;
      let otherEarned = 0;
      const byCampaign: Record<string, { earned: number; impressions: number; adType: string }> = {};
      let entriesInRange = 0;

      for (const [key, entry] of Object.entries(earningsLog)) {
        const entryDate = entry.date ? new Date(entry.date) : (entry.timestamp?.toDate?.() || new Date(0));
        if (entryDate < cutoff) continue;

        entriesInRange++;
        const earned = entry.creditsEarned || 0;
        totalEarned += earned;

        const adType = (entry.adType || 'banner').toLowerCase();
        if (adType === 'banner') {
          bannerEarned += earned;
        } else if (adType === 'interstitial') {
          interstitialEarned += earned;
        } else {
          otherEarned += earned;
        }

        const campaignId = entry.campaignId || entry.adId || 'unknown';
        if (!byCampaign[campaignId]) {
          byCampaign[campaignId] = { earned: 0, impressions: 0, adType };
        }
        byCampaign[campaignId].earned += earned;
        byCampaign[campaignId].impressions += (entry.impressions || 1);
      }

      const periodLabel = period === 'today' ? 'Today' : period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'All Time';

      let report = `\ud83d\udcca Revenue Breakdown — ${periodLabel}\n`;
      report += `${'═'.repeat(40)}\n\n`;
      report += `Total Earned:        ${totalEarned} credits\n`;
      report += `  \u2022 Banner:           ${bannerEarned} credits (${totalEarned > 0 ? Math.round(bannerEarned / totalEarned * 100) : 0}%)\n`;
      report += `  \u2022 Interstitial:     ${interstitialEarned} credits (${totalEarned > 0 ? Math.round(interstitialEarned / totalEarned * 100) : 0}%)\n`;
      if (otherEarned > 0) {
        report += `  \u2022 Other:            ${otherEarned} credits\n`;
      }
      report += `  \u2022 Log Entries:      ${entriesInRange}\n\n`;

      const campaignEntries = Object.entries(byCampaign).sort((a, b) => b[1].earned - a[1].earned);
      if (campaignEntries.length > 0) {
        report += `By Campaign:\n`;
        for (const [id, data] of campaignEntries.slice(0, 10)) {
          report += `  ${id} (${data.adType}): ${data.earned} credits, ${data.impressions} impressions\n`;
        }
        if (campaignEntries.length > 10) {
          report += `  ... and ${campaignEntries.length - 10} more campaigns.\n`;
        }
      } else {
        report += `No earnings data found for this period.\n`;
      }

      return {
        content: [{ type: "text", text: report }]
      };
    }

    if (request.params.name === "migrate_from_admob") {
      const args = request.params.arguments as any;
      const code = args.code;

      let suggestion = "Please review the AdTogether SDK documentation to migrate from AdMob.";
      
      if (code.includes("react-native-google-mobile-ads") || code.includes("BannerAd") || code.includes("InterstitialAd")) {
        if (code.includes("BannerAd")) {
          suggestion = `Migrating React/React Native Banner from AdMob:
1. Replace 'react-native-google-mobile-ads' imports with '@adtogether/web-sdk/react' (web) or '@adtogether/react-native-sdk' (RN).
2. Replace <BannerAd /> with <AdTogetherBanner />
3. Map your AdMob adUnitId to an AdTogether adUnitId.
Example:
import { AdTogetherBanner } from '@adtogether/web-sdk/react';

<AdTogetherBanner 
  adUnitId="home_banner" 
  showCloseButton={true}
  onAdLoaded={() => console.log('Ad loaded!')}
/>`;
        } else if (code.includes("InterstitialAd")) {
           suggestion = `Migrating React/React Native Interstitial from AdMob:
1. Replace InterstitialAd.createForAdRequest with the <AdTogetherInterstitial> component.
2. Initialize AdTogether early in your app lifecycle via AdTogether.initialize({ appId: 'YOUR_APP_ID' }).
3. Control visibility with isOpen prop and handle dismissal with onClose.
Example:
import { AdTogetherInterstitial } from '@adtogether/web-sdk/react';

<AdTogetherInterstitial
  adUnitId="level_complete"
  isOpen={showAd}
  onClose={() => setShowAd(false)}
  closeDelay={5}
/>`;
        }
      } else if (code.includes("com.google.android.gms.ads.AdView") || code.includes("com.google.android.gms.ads")) {
        suggestion = `Migrating Android Banner from AdMob:
1. Replace AdMob dependency with: implementation("com.adtogether:sdk:0.3.0")
2. Replace XML AdView with the Jetpack Compose AdTogetherBanner composable.
Example (Compose):
import com.adtogether.sdk.views.AdTogetherBanner

AdTogetherBanner(
    adUnitId = "home_banner",
    modifier = Modifier.fillMaxWidth()
)`;
      } else if (code.includes("google_mobile_ads") && code.includes("AdWidget")) {
        suggestion = `Migrating Flutter Banner from AdMob:
1. Remove 'google_mobile_ads' dependency and add 'adtogether_sdk' to pubspec.yaml.
2. Replace AdWidget(ad: myBanner) with AdTogetherBanner(adUnitId: 'home_banner').
Example:
import 'package:adtogether_sdk/adtogether_sdk.dart';

AdTogetherBanner(
  adUnitId: 'home_banner',
  onAdLoaded: () => print('Ad loaded!'),
)`;
      } else if (code.includes("GADBannerView") || code.includes("GADInterstitialAd")) {
        suggestion = `Migrating iOS from AdMob:
1. Replace GoogleMobileAds import with AdTogether.
2. Replace GADBannerView with AdTogetherView (SwiftUI).
3. Replace GADInterstitialAd with AdTogetherInterstitialView.
Example:
import AdTogether

AdTogetherView(
    adUnitId: "home_banner",
    showCloseButton: true,
    onAdLoaded: { print("Ad loaded!") }
)
.frame(height: 50)`;
      } else {
        suggestion = `Generic AdMob Migration:
1. Replace AdMob initialization with: AdTogether.initialize({ appId: 'YOUR_APP_ID' })
2. Swap ad components per platform:
   - Web/React: <AdTogetherBanner adUnitId="..." /> (from '@adtogether/web-sdk/react')
   - Android: AdTogetherBanner(adUnitId = "...") Compose composable
   - Flutter: AdTogetherBanner(adUnitId: '...')
   - iOS: AdTogetherView(adUnitId: "...") SwiftUI view
3. For interstitials, use the platform-specific interstitial component.
See the SDK README for your platform for full examples.`;
      }

      return {
        content: [{ type: "text", text: suggestion }]
      };
    }
    
    throw new Error(`Tool not found: ${request.params.name}`);
  });

  return server;
}
