import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { adminDb as db } from '@/lib/firebase-admin';
import { screenAdContent } from '@/app/create-ad/actions';
import { consumeUserRateLimit } from '@/lib/api-rate-limit';
import { parseSafeHttpUrl } from '@/lib/safe-url-fetch';
import * as fs from 'fs';
import * as path from 'path';

// Keep MCP install advice tied to a release that has completed on every
// registry. Source manifests may advance before their npm/Maven/pub/iOS
// artifacts are public, so advertising the source version by default can send
// an integrator to a package manager version that does not exist yet.
const SDK_SOURCE_VERSION = "0.5.9";
const LAST_PREVIOUS_SDK_RELEASE_VERSION = "0.5.7";
const STABLE_SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function compareStableVersions(left: string, right: string): number {
  const leftParts = left.match(STABLE_SEMVER)?.slice(1).map(Number);
  const rightParts = right.match(STABLE_SEMVER)?.slice(1).map(Number);
  if (!leftParts || !rightParts) return 0;

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

function getPublishedSdkVersion(): string {
  const configuredVersion = process.env.ADTOGETHER_PUBLISHED_SDK_VERSION?.trim();
  if (!configuredVersion || !STABLE_SEMVER.test(configuredVersion)) {
    return LAST_PREVIOUS_SDK_RELEASE_VERSION;
  }

  // Never let an environment typo or an early release setting advertise a
  // version newer than this deployed server can describe accurately.
  if (compareStableVersions(configuredVersion, SDK_SOURCE_VERSION) > 0) {
    return LAST_PREVIOUS_SDK_RELEASE_VERSION;
  }

  return configuredVersion;
}

function sdkReleasePendingNotice(): string | null {
  const publishedSdkVersion = getPublishedSdkVersion();
  if (publishedSdkVersion === SDK_SOURCE_VERSION) return null;

  return `⚠️ SDK RELEASE PENDING\n\nSDK ${SDK_SOURCE_VERSION} is not yet confirmed across the public SDK registries. The preceding release line is ${publishedSdkVersion}. This MCP server will not provide ${SDK_SOURCE_VERSION} source-version installation instructions until the release is published.`;
}

// Embedded fallback documentation in case filesystem is not accessible in serverless bundles
const EMBEDDED_RESOURCES: Record<string, string> = {
  "docs/SDK_SECURITY_INVARIANTS.md": `# SDK Security & Architecture Invariants

## Ad type enforcement

Banner components always request \`adType: 'banner'\`. They never fetch or render an interstitial. Interstitials pay a higher rate, so this separation is a payout-fraud invariant.

## Impression verification

- A signed 15-minute grant binds the ad, App ID, publisher, ad type, and ingress country. The server consumes each nonce once in the credit transaction.
- \`TRUSTED_GEO_PROVIDER\` selects exactly one trusted geo header. Client country fields and another provider's headers never set pricing.
- Web viewability is required by default. Missing browser headers never waive it. A verified Play Integrity or App Attest proof is the only native exemption.
- The transaction re-reads the campaign and rejects an inactive campaign before consuming a grant or changing balances.
- Firestore clients cannot access \`config\`, replay records, attestation records, or credit-bearing fields. App IDs are created through the authenticated server route.

## Native app attestation

- The Admin-only \`nativeAttestationApps\` record is signed into the grant. Client platform and bundle fields never enable or waive enforcement.
- Play Integrity is bound to the exact grant hash and must match its registered package, timestamp, recognition, licensing, and device-integrity verdicts.
- App Attest uses a one-time challenge and a transactional monotonic counter. The backend retains validated current Apple extension metadata as risk signals.
- Deploy the rules and TTL settings for grants, challenges, and shared attestation rate limits before enabling a protected App ID.
`,
  "AD_CONTENT_POLICY.md": `# AdTogether Content Policy

All advertisements must comply with the AdTogether Content Policy:

## 1. Prohibited Content
- **Sexual Content**: Explicit sexual content, pornography, suggestive nudity, adult entertainment.
- **Violence and Gore**: Graphic violence, physical trauma, depictions of torture or cruelty.
- **Drugs and Illegal Substances**: Promotion, sale, or irresponsible use of illegal drugs or paraphernalia.
- **Hate Speech and Harassment**: Discrimination, hate, bullying, or intimidation against protected groups.
- **Illegal Acts and Regulated Goods**: Weapons, firearms, explosives, hacking tools, illegal acts.
- **Scams & Deceptive Content**: Misleading claims, phishing, malware, fake endorsements.

## 2. Enforcement
All ads submitted are subject to automated AI screening and manual audits.
`,
  "sdk/web-sdk/README.md": `# @adtogether/web-sdk
Official TypeScript/JavaScript SDK for AdTogether on the Web and React / Next.js.
Install: \`npm install @adtogether/web-sdk\`
React components: \`import { AdTogetherBanner, AdTogetherInterstitial } from '@adtogether/web-sdk/react';\`
Pre-fetching: \`await AdTogether.prefetchAd('placement_id', 'interstitial');\` (30s in-memory TTL)
`,
  "sdk/react-native-sdk/README.md": `# @adtogether/react-native-sdk
Official React Native SDK for AdTogether.
Install: \`npm install @adtogether/react-native-sdk\`
Components: \`<AdTogetherBanner adUnitId="..." />\`
`,
  "sdk/android-sdk/README.md": `# AdTogether Android SDK
Official Android Kotlin SDK with Jetpack Compose support.
Dependency: \`implementation("com.relaxsoftwareapps.adtogether:adtogether-sdk:0.5.9")\`
Play Integrity support requires the Admin-only native attestation setup record.
`,
  "sdk/ios-sdk/README.md": `# AdTogether iOS SDK
Official Swift / SwiftUI iOS SDK for AdTogether.
SPM / CocoaPods: \`pod 'AdTogether', '~> 0.5.9'\`
Apple App Attest enforcement is supported on iOS only.
`,
  "sdk/adtogether_sdk/README.md": `# adtogether_sdk (Flutter)
Official Flutter / Dart SDK for AdTogether.
Install: \`flutter pub add adtogether_sdk:^0.5.9\`
`,
  "docs/NATIVE_APP_ATTESTATION.md": `# Native App Attestation

Native enforcement is configured per App ID in the Admin-only \`nativeAttestationApps\` collection. The document ID is the lowercase SHA-256 of the App ID, and its \`appId\` and \`publisherUid\` must match the publisher record.

Android record:
\`\`\`json
{ "appId": "YOUR_APP_ID", "publisherUid": "FIRESTORE_USER_UID", "enabled": true, "provider": "play-integrity", "bundleId": "com.example.app", "playIntegrityProjectNumber": "123456789012" }
\`\`\`
The project number must equal \`PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER\` and the backend service account must belong to the Cloud project linked in Play Console.

iOS record:
\`\`\`json
{ "appId": "YOUR_APP_ID", "publisherUid": "FIRESTORE_USER_UID", "enabled": true, "provider": "app-attest", "bundleId": "com.example.app", "appIdPrefix": "ABCDE12345", "environment": "production" }
\`\`\`

Android SDK 0.5.6+ supports Play Integrity. iOS SDK 0.5.6+ supports App Attest on iOS. React Native, Flutter, Web, REST, and the macOS iOS-SDK target do not support native enforcement.

Set \`TRUSTED_GEO_PROVIDER\` only after verifying one ingress strips and injects its country header. Deploy backend code, Firestore rules, and TTL indexes; publish the matching native SDK artifacts and SPM tag; then enable a staging App ID before production rollout. Attestation raises automation cost but does not prove a human saw an ad.
`,
};

// Map only the resources advertised above to fixed, repository-relative paths.
// A caller-controlled URI must never determine a filesystem path.
const RESOURCE_PATHS: Record<string, string> = {
  "file:///docs/SDK_SECURITY_INVARIANTS.md": "docs/SDK_SECURITY_INVARIANTS.md",
  "file:///docs/NATIVE_APP_ATTESTATION.md": "docs/NATIVE_APP_ATTESTATION.md",
  "file:///AD_CONTENT_POLICY.md": "AD_CONTENT_POLICY.md",
  "file:///sdk/web-sdk/README.md": "sdk/web-sdk/README.md",
  "file:///sdk/react-native-sdk/README.md": "sdk/react-native-sdk/README.md",
  "file:///sdk/android-sdk/README.md": "sdk/android-sdk/README.md",
  "file:///sdk/ios-sdk/README.md": "sdk/ios-sdk/README.md",
  "file:///sdk/adtogether_sdk/README.md": "sdk/adtogether_sdk/README.md",
};

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
        logging: {},
      },
    }
  );

  // ==========================================
  // Resources
  // ==========================================
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "file:///docs/SDK_SECURITY_INVARIANTS.md",
          name: "SDK Security Invariants",
          mimeType: "text/markdown",
          description: "Defines architecture and security constraints for the SDK (e.g. Banner vs Interstitial anti-fraud rules).",
        },
        {
          uri: "file:///docs/NATIVE_APP_ATTESTATION.md",
          name: "Native App Attestation Setup",
          mimeType: "text/markdown",
          description: "Explains Android Play Integrity and iOS App Attest setup, supported SDKs, per-App-ID enforcement, and rollout requirements.",
        },
        {
          uri: "file:///AD_CONTENT_POLICY.md",
          name: "Ad Content Policy",
          mimeType: "text/markdown",
          description: "Defines prohibited content categories and review guidelines for ad submissions.",
        },
        {
          uri: "file:///sdk/web-sdk/README.md",
          name: "Web SDK Integration Guide",
          mimeType: "text/markdown",
          description: "Integration guide for the AdTogether Web & React/Next.js SDK. Web clients do not support native app attestation.",
        },
        {
          uri: "file:///sdk/react-native-sdk/README.md",
          name: "React Native SDK Integration Guide",
          mimeType: "text/markdown",
          description: "Integration guide for the AdTogether React Native SDK. React Native app attestation bridges are not implemented yet.",
        },
        {
          uri: "file:///sdk/android-sdk/README.md",
          name: "Android SDK Integration Guide",
          mimeType: "text/markdown",
          description: "Integration guide for the AdTogether Android (Kotlin & Jetpack Compose) SDK, including Play Integrity support.",
        },
        {
          uri: "file:///sdk/ios-sdk/README.md",
          name: "iOS SDK Integration Guide",
          mimeType: "text/markdown",
          description: "Integration guide for the AdTogether iOS (Swift & SwiftUI) SDK, including Apple App Attest support.",
        },
        {
          uri: "file:///sdk/adtogether_sdk/README.md",
          name: "Flutter SDK Integration Guide",
          mimeType: "text/markdown",
          description: "Integration guide for the AdTogether Flutter SDK. Flutter native attestation bridges are not implemented yet.",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const relativePath = Object.prototype.hasOwnProperty.call(RESOURCE_PATHS, uri)
      ? RESOURCE_PATHS[uri]
      : undefined;

    if (!relativePath) {
      throw new Error(`Resource not found: ${uri}`);
    }

    // SDK README files in this source tree can refer to a version that is
    // staged for release but not yet available from package managers. Do not
    // expose those install instructions through MCP until all artifacts are
    // confirmed public.
    const releasePending = sdkReleasePendingNotice();
    if (releasePending && relativePath.startsWith("sdk/")) {
      return {
        contents: [{
          uri: request.params.uri,
          mimeType: "text/markdown",
          text: releasePending,
        }],
      };
    }

    let content = "";
    try {
      const filePath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, "utf8");
      }
    } catch {
      // Fallback to embedded documentation
    }

    if (!content && EMBEDDED_RESOURCES[relativePath]) {
      content = EMBEDDED_RESOURCES[relativePath];
    }

    if (!content) {
      throw new Error(`Failed to read resource: ${relativePath}`);
    }

    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "text/markdown",
          text: content,
        },
      ],
    };
  });

  // ==========================================
  // Prompts
  // ==========================================
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: "integrate-ads",
          description: "A guided flow to generate, configure, and validate AdTogether ad snippets.",
          arguments: [
            {
              name: "framework",
              description: "The frontend framework (e.g. nextjs, react, react-native, android, ios, flutter)",
              required: true,
            },
            {
              name: "adType",
              description: "The type of ad to integrate ('banner' or 'interstitial')",
              required: true,
            },
            {
              name: "adUnitId",
              description: "The AdTogether ad unit ID (e.g. 'home_banner', 'level_complete')",
              required: false,
            },
          ],
        },
        {
          name: "troubleshoot",
          description: "A diagnostic prompt that walks through common integration and fill issues step by step.",
          arguments: [
            {
              name: "issue",
              description: "A brief description of the issue (e.g., 'no fill', 'compile error', 'unauthorized')",
              required: false,
            },
          ],
        },
      ],
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "integrate-ads") {
      const framework = args?.framework || "nextjs";
      const adType = args?.adType || "banner";
      const unitId = args?.adUnitId || args?.unitId || "example_" + adType;

      return {
        description: "AdTogether Integration Flow",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I want to integrate an AdTogether ad in my project.\n\nFramework: ${framework}\nAd Type: ${adType}\nAd Unit ID: ${unitId}\n\nPlease:\n1. Generate the required component code using the generate_integration_snippet tool.\n2. Validate the generated snippet with validate_ad_component to ensure it adheres to SDK security invariants.\n3. Explain where SDK initialization (AdTogether.initialize) belongs in the app lifecycle.\n4. If native app attestation is enabled or requested, consult the Native App Attestation Setup resource and confirm the selected SDK supports it before recommending enforcement.`,
            },
          },
        ],
      };
    }

    if (name === "troubleshoot") {
      const issue = args?.issue || "Ads are not showing / no fill";
      return {
        description: "Troubleshooting Guide",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `I am experiencing an issue with my AdTogether integration: "${issue}".\n\nPlease help me diagnose and fix this step-by-step:\n1. Check account credits and configuration using diagnose_no_fill and get_account_status.\n2. Check for recent SDK runtime errors using get_recent_sdk_errors.\n3. Validate the component code with validate_ad_component.\n4. Check SDK version currency with check_sdk_version.`,
            },
          },
        ],
      };
    }

    throw new Error(`Prompt not found: ${name}`);
  });

  // ==========================================
  // Tools Schema List
  // ==========================================
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_account_status",
          description: "Fetch current ad credit balance, total spent, country, and account health for the authenticated App ID.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_app_config",
          description: "Retrieve the appId, bundleId, and authorized web domains for the authenticated project.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "list_campaigns",
          description: "Retrieve active/paused ad campaigns owned by this account along with impressions, clicks, status, and ad types.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_campaign_rejection_reason",
          description: "Get the specific AD_CONTENT_POLICY.md violation reason for a rejected or flagged campaign.",
          inputSchema: {
            type: "object",
            properties: {
              campaignId: {
                type: "string",
                description: "The unique ID of the campaign to check.",
              },
            },
            required: ["campaignId"],
          },
        },
        {
          name: "draft_campaign",
          description: "Submit a screened draft campaign for later dashboard review.",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Headline title of the advertisement." },
              targetUrl: { type: "string", description: "Click-through destination URL." },
              adType: {
                type: "string",
                enum: ["banner", "interstitial"],
                description: "The ad format ('banner' or 'interstitial').",
              },
              description: { type: "string", description: "Body text or value proposition." },
              imageBase64: { type: "string", description: "Optional base64-encoded creative image." },
            },
            required: ["title", "targetUrl", "adType", "description"],
          },
        },
        {
          name: "get_recent_sdk_errors",
          description: "Fetch the last 24 hours of client SDK errors logged for the authenticated account.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "simulate_ad_request",
          description: "Simulate an ad request with the user's configuration to verify if an ad would be fulfilled.",
          inputSchema: {
            type: "object",
            properties: {
              unitId: { type: "string", description: "Ad unit ID to simulate." },
              adType: {
                type: "string",
                enum: ["banner", "interstitial"],
                description: "Ad format to request ('banner' or 'interstitial').",
              },
            },
            required: ["adType"],
          },
        },
        {
          name: "screen_ad_content",
          description: "Check ad copy (title, description, URL) against AdTogether Content Policy (AD_CONTENT_POLICY.md) for prohibited content like scams, violence, adult content, drugs, or hate speech.",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Ad headline/title." },
              description: { type: "string", description: "Ad descriptive text." },
              targetUrl: { type: "string", description: "Ad click-through URL." },
            },
            required: ["title", "description", "targetUrl"],
          },
        },
        {
          name: "generate_integration_snippet",
          description: "Generate copy-paste integration code for AdTogether SDK components across Web/React, React Native, Android, iOS, and Flutter.",
          inputSchema: {
            type: "object",
            properties: {
              framework: {
                type: "string",
                enum: ["nextjs", "react", "react-native", "android", "kotlin", "ios", "swift", "flutter", "dart"],
                description: "Target framework or programming language.",
              },
              adType: {
                type: "string",
                enum: ["banner", "interstitial"],
                description: "The ad unit type ('banner' or 'interstitial').",
              },
              adUnitId: {
                type: "string",
                description: "Optional custom unit ID (e.g. 'home_banner', 'level_complete').",
              },
              appId: {
                type: "string",
                description: "Optional custom App ID to insert into initialization snippet.",
              },
            },
            required: ["framework", "adType"],
          },
        },
        {
          name: "validate_ad_component",
          description: "Check user-provided component code against SDK_SECURITY_INVARIANTS.md, correct imports, Next.js 16 rules, and anti-fraud guidelines.",
          inputSchema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The source code of the ad component or screen to validate.",
              },
              framework: {
                type: "string",
                description: "Optional framework identifier ('web', 'react', 'nextjs', 'android', 'ios', 'flutter', 'react-native').",
              },
            },
            required: ["code"],
          },
        },
        {
          name: "diagnose_no_fill",
          description: "Comprehensive diagnostic check to determine why ads are not showing. Analyzes credits, bundle ID, authorized domains, campaign inventory, and recent SDK errors.",
          inputSchema: {
            type: "object",
            properties: {
              unitId: {
                type: "string",
                description: "The ad unit ID that is failing to fill (optional).",
              },
              bundleId: {
                type: "string",
                description: "The bundle ID configured in the client app (optional, for mismatch detection).",
              },
              domain: {
                type: "string",
                description: "The domain the ad is being served from (optional, for web apps).",
              },
            },
          },
        },
        {
          name: "check_sdk_version",
          description: "Compare installed AdTogether SDK version against latest release across all 5 platforms ('web', 'react-native', 'android', 'flutter', 'ios').",
          inputSchema: {
            type: "object",
            properties: {
              platform: {
                type: "string",
                enum: ["web", "react-native", "android", "flutter", "ios"],
                description: "The SDK platform to check.",
              },
              currentVersion: {
                type: "string",
                description: "The user's currently installed SDK version (e.g. '0.4.0', '0.4.5', '^0.3.0').",
              },
            },
            required: ["platform", "currentVersion"],
          },
        },
        {
          name: "get_revenue_breakdown",
          description: "Get structured revenue breakdown by ad type (banner vs interstitial), time period, and campaign.",
          inputSchema: {
            type: "object",
            properties: {
              period: {
                type: "string",
                enum: ["today", "7d", "30d", "all"],
                description: "Time period filter: 'today', '7d', '30d', or 'all'. Defaults to '30d'.",
              },
            },
          },
        },
        {
          name: "migrate_from_admob",
          description: "Guided migration tool. Converts AdMob banner and interstitial code to AdTogether SDK equivalent across React, React Native, Android Compose, iOS SwiftUI, and Flutter.",
          inputSchema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The user's current AdMob implementation code.",
              },
            },
            required: ["code"],
          },
        },
      ],
    };
  });

  // ==========================================
  // Tool Execution Handler
  // ==========================================
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const userUid = extra?.authInfo?.clientId;
    const name = request.params.name;
    const rawArgs = (request.params.arguments || {}) as Record<string, any>;

    // Helper for auth enforcement on account-specific tools
    const requireAuth = () => {
      if (!userUid) {
        throw new Error('Authentication Required: This tool requires a Firebase ID token in the Authorization Bearer header. App IDs cannot authorize account access.');
      }
      return userUid;
    };

    try {
      // ----------------------------------------------------
      // 1. get_account_status
      // ----------------------------------------------------
      if (name === "get_account_status") {
        const uid = requireAuth();
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
          return {
            isError: true,
            content: [{ type: "text", text: "User account not found in database for the provided App ID." }],
          };
        }

        const userData = userDoc.data() || {};
        const earningsLog = userData.earningsLog || {};
        const totalEarned = Object.values(earningsLog).reduce(
          (sum: number, e: any) => sum + (Number(e?.creditsEarned) || 0),
          0
        );

        const info = {
          appId: userData.appIds?.[0] || userData.appId || "Unknown",
          credits: userData.credits || 0,
          country: userData.country || "Unknown",
          totalEarnedCredits: totalEarned,
          bundleId: userData.bundleId || null,
          authorizedDomains: userData.authorizedDomains || [],
          accountHealth: (userData.credits || 0) > 0 ? "healthy" : "low_credits",
        };

        return {
          content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
        };
      }

      // ----------------------------------------------------
      // 2. get_app_config
      // ----------------------------------------------------
      if (name === "get_app_config") {
        const uid = requireAuth();
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
          return {
            isError: true,
            content: [{ type: "text", text: "User account not found." }],
          };
        }
        const data = userDoc.data() || {};
        const config = {
          appId: data.appIds?.[0] || data.appId || "Unknown",
          allAppIds: data.appIds || [data.appId].filter(Boolean),
          bundleId: data.bundleId || "com.example.app",
          authorizedDomains: data.authorizedDomains || [],
        };
        return {
          content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
        };
      }

      // ----------------------------------------------------
      // 3. list_campaigns
      // ----------------------------------------------------
      if (name === "list_campaigns") {
        const uid = requireAuth();
        const snapshot = await db.collection("ads").where("ownerUid", "==", uid).get();

        const campaigns = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "Untitled",
            targetUrl: data.clickUrl || data.targetUrl || "",
            active: !!data.active,
            adType: data.adType || "banner",
            status: data.status || (data.active ? "active" : "paused"),
            impressions: data.impressions || 0,
            clicks: data.clicks || 0,
            createdAt: data.createdAt || null,
            unitId: data.unitId || null,
          };
        });

        return {
          content: [{ type: "text", text: JSON.stringify(campaigns, null, 2) }],
        };
      }

      // ----------------------------------------------------
      // 4. get_campaign_rejection_reason
      // ----------------------------------------------------
      if (name === "get_campaign_rejection_reason") {
        const uid = requireAuth();
        const campaignId = rawArgs.campaignId;
        if (!campaignId) {
          return {
            isError: true,
            content: [{ type: "text", text: "Missing required argument: 'campaignId'." }],
          };
        }

        const adDoc = await db.collection("ads").doc(campaignId).get();
        if (!adDoc.exists || adDoc.data()?.ownerUid !== uid) {
          return {
            isError: true,
            content: [{ type: "text", text: `Campaign "${campaignId}" not found or not owned by your account.` }],
          };
        }

        const data = adDoc.data()!;
        const reason = data.rejectionReason || "No rejection reason found. The campaign is not marked as rejected.";
        return {
          content: [{ type: "text", text: `Campaign "${campaignId}" status: ${data.status || "unknown"}\nRejection Reason: ${reason}` }],
        };
      }

      // ----------------------------------------------------
      // 5. draft_campaign
      // ----------------------------------------------------
      if (name === "draft_campaign") {
        const uid = requireAuth();
        const { title, targetUrl, adType, description, imageBase64 } = rawArgs;

        if (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 30 ||
          typeof description !== 'string' || description.trim().length === 0 || description.trim().length > 90 ||
          (adType !== 'banner' && adType !== 'interstitial')) {
          return {
            isError: true,
            content: [{ type: "text", text: "Provide a title of 30 characters or fewer, a description of 90 characters or fewer, and a valid ad type." }],
          };
        }

        let clickUrl: string;
        try {
          clickUrl = parseSafeHttpUrl(targetUrl).toString();
        } catch {
          return {
            isError: true,
            content: [{ type: "text", text: "targetUrl must be a valid public HTTP or HTTPS URL." }],
          };
        }

        const validBase64 = typeof imageBase64 === 'string' && imageBase64.length <= 512_000 &&
          /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(imageBase64);
        if (imageBase64 !== undefined && imageBase64 !== null && !validBase64) {
          return {
            isError: true,
            content: [{ type: "text", text: "imageBase64 must be valid base64 and no larger than 512 KB." }],
          };
        }

        let allowed: boolean;
        try {
          allowed = await consumeUserRateLimit({ uid, scope: 'campaign-write', limit: 10, windowMs: 60_000 });
        } catch {
          return {
            isError: true,
            content: [{ type: "text", text: "Campaign changes are temporarily unavailable. Please try again." }],
          };
        }
        if (!allowed) {
          return {
            isError: true,
            content: [{ type: "text", text: "Too many campaign changes. Please try again shortly." }],
          };
        }

        const screening = await screenAdContent(title.trim(), description.trim(), clickUrl);
        if (screening.success !== true) {
          return {
            isError: true,
            content: [{ type: "text", text: "Ad screening is temporarily unavailable. The draft was not saved." }],
          };
        }
        if (screening.passed !== true) {
          const reason = typeof screening.reason === 'string' && screening.reason.trim()
            ? screening.reason.trim().slice(0, 300)
            : 'Violates content guidelines.';
          return {
            isError: true,
            content: [{ type: "text", text: `Ad rejected by policy: ${reason}` }],
          };
        }

        // Drafts intentionally do not enter `ads`: only /api/campaigns can
        // create a serveable campaign after validating its full creative.
        const draftRef = db.collection("campaignDrafts").doc();
        await draftRef.set({
          title: title.trim(),
          clickUrl,
          adType,
          description: description.trim(),
          imageBase64: imageBase64 || null,
          ownerUid: uid,
          status: "screened_draft",
          screening: { passed: true, screenedAt: new Date().toISOString() },
          createdAt: new Date().toISOString(),
        });

        return {
          content: [{ type: "text", text: `✅ Screened draft saved with ID: ${draftRef.id}. It is not active and cannot serve until it is converted through the authenticated campaign workflow.` }],
        };
      }

      // ----------------------------------------------------
      // 6. get_recent_sdk_errors
      // ----------------------------------------------------
      if (name === "get_recent_sdk_errors") {
        const uid = requireAuth();
        const errorsSnap = await db
          .collection("sdkErrors")
          .where("uid", "==", uid)
          .orderBy("timestamp", "desc")
          .limit(10)
          .get()
          .catch(() => null);

        if (!errorsSnap || errorsSnap.empty) {
          return {
            content: [{ type: "text", text: "✅ No recent SDK errors recorded for this account in the last 24 hours." }],
          };
        }

        const errors = errorsSnap.docs.map((d: any) => {
          const data = d.data();
          return {
            id: d.id,
            timestamp: data.timestamp?.toDate?.()?.toISOString?.() || data.timestamp || "unknown",
            code: data.code || "UNKNOWN_ERROR",
            message: data.message || data.error || "Unknown error",
            platform: data.platform || "unknown",
            unitId: data.unitId || null,
          };
        });

        return {
          content: [{ type: "text", text: JSON.stringify(errors, null, 2) }],
        };
      }

      // ----------------------------------------------------
      // 7. simulate_ad_request
      // ----------------------------------------------------
      if (name === "simulate_ad_request") {
        const uid = requireAuth();
        const { unitId, adType = "banner" } = rawArgs;
        const simChecks: string[] = [];
        let wouldFill = true;

        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data() || {};
        const credits = userData.credits || 0;

        if (credits <= 0) {
          simChecks.push(`❌ Account Credits: Balance is ${credits} (need > 0 for ads to serve)`);
          wouldFill = false;
        } else {
          simChecks.push(`✅ Account Credits: Balance is ${credits} credits`);
        }

        const validTypes = ["banner", "interstitial"];
        if (!validTypes.includes(adType)) {
          simChecks.push(`❌ Invalid adType: "${adType}". Must be one of: ${validTypes.join(", ")}`);
          wouldFill = false;
        } else {
          simChecks.push(`✅ Ad Format: Valid ${adType} request`);
        }

        const campaignSnap = await db
          .collection("ads")
          .where("active", "==", true)
          .where("adType", "==", adType)
          .limit(5)
          .get();

        if (campaignSnap.empty) {
          simChecks.push(`❌ Network Inventory: No active ${adType} campaigns found across the exchange network`);
          wouldFill = false;
        } else {
          simChecks.push(`✅ Network Inventory: Active ${adType} campaigns available in the pool (${campaignSnap.size}+ found)`);
        }

        const result = wouldFill
          ? `✅ Simulation PASSED — Ad request for placement "${unitId || "default"}" (${adType}) would successfully fill.\n\nDiagnostics:\n- ${simChecks.join("\n- ")}`
          : `❌ Simulation FAILED — Ad request would NOT fill.\n\nDiagnostics:\n- ${simChecks.join("\n- ")}`;

        return {
          content: [{ type: "text", text: result }],
        };
      }

      // ----------------------------------------------------
      // 8. screen_ad_content (Public Utility Tool)
      // ----------------------------------------------------
      if (name === "screen_ad_content") {
        const { title = "", description = "", targetUrl = "" } = rawArgs;
        const combined = `${title} ${description} ${targetUrl}`.toLowerCase();

        const violations: string[] = [];
        const categories: Record<string, { pass: boolean; note: string }> = {
          "Sexual Content": { pass: true, note: "No explicit adult content detected." },
          "Violence & Gore": { pass: true, note: "No depictions of violence or trauma detected." },
          "Drugs & Regulated Substances": { pass: true, note: "No illicit drug promotions detected." },
          "Hate Speech & Harassment": { pass: true, note: "No discriminatory or abusive language detected." },
          "Weapons & Illegal Acts": { pass: true, note: "No illegal goods or weapon sales detected." },
          "Scams & Misleading Claims": { pass: true, note: "No deceptive schemes detected." },
        };

        // Heuristic checks aligned with AD_CONTENT_POLICY.md
        if (/\b(scam|free money|get rich quick|pyramid scheme|guaranteed 1000%|crypto double|click here to win iphone)\b/i.test(combined)) {
          categories["Scams & Misleading Claims"] = { pass: false, note: "Detected patterns associated with deceptive or get-rich-quick claims." };
          violations.push("Scams & Misleading Claims: Questionable or deceptive claims detected.");
        }

        if (/\b(porn|xxx|nudity|escort|cam girl|adult dating|sex chat)\b/i.test(combined)) {
          categories["Sexual Content"] = { pass: false, note: "Explicit adult keywords detected." };
          violations.push("Sexual Content: Explicit adult content or links prohibited.");
        }

        if (/\b(buy cocaine|weed delivery|buy vape|cheap cigarettes|buy steroids|darkweb drugs)\b/i.test(combined)) {
          categories["Drugs & Regulated Substances"] = { pass: false, note: "Regulated drug keywords detected." };
          violations.push("Drugs & Regulated Substances: Sale or promotion of regulated substances prohibited.");
        }

        if (/\b(buy guns|ghost gun|explosives|buy ammo|hack account|ddos tool)\b/i.test(combined)) {
          categories["Weapons & Illegal Acts"] = { pass: false, note: "Weapons or illicit tools detected." };
          violations.push("Weapons & Illegal Acts: Weapons and illegal service promotions prohibited.");
        }

        const isSafe = violations.length === 0;
        const responseData = {
          isSafe,
          verdict: isSafe ? "APPROVED" : "REJECTED",
          policy: "AD_CONTENT_POLICY.md",
          violations,
          categoryBreakdown: categories,
          recommendation: isSafe
            ? "Content complies with standard ad guidelines and is ready for submission."
            : "Revise ad title and description to remove flagged terms before submitting.",
        };

        return {
          content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
        };
      }

      // ----------------------------------------------------
      // 9. generate_integration_snippet (Public Utility Tool)
      // ----------------------------------------------------
      if (name === "generate_integration_snippet") {
        const releasePending = sdkReleasePendingNotice();
        const publishedVersion = getPublishedSdkVersion();

        const { framework, adType, adUnitId, appId = "YOUR_APP_ID" } = rawArgs;
        const unitId = adUnitId || `example_${adType}`;

        let snippet = "";
        const fw = (framework || "nextjs").toLowerCase();

        if (fw === "nextjs" || fw === "react") {
          if (adType === "banner") {
            snippet = `"use client";

import { useEffect } from 'react';
import { AdTogether } from '@adtogether/web-sdk';
import { AdTogetherBanner } from '@adtogether/web-sdk/react';

export default function MyAdBanner() {
  useEffect(() => {
    // Initialize once when the component mounts (or in your root provider)
    AdTogether.initialize({ appId: '${appId}' });
  }, []);

  return (
    <div className="w-full max-w-[370px] mx-auto my-4">
      <AdTogetherBanner
        adUnitId="${unitId}"
        showCloseButton={true}
        onAdLoaded={() => console.log('AdTogether banner loaded')}
        onAdFailedToLoad={(err) => console.error('Banner failed to load:', err)}
        onAdClosed={() => console.log('Banner closed by user')}
      />
    </div>
  );
}`;
          } else {
            snippet = `"use client";

import { useEffect, useState } from 'react';
import { AdTogether } from '@adtogether/web-sdk';
import { AdTogetherInterstitial } from '@adtogether/web-sdk/react';

export default function MyInterstitialButton() {
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    AdTogether.initialize({ appId: '${appId}' });
  }, []);

  return (
    <div>
      <button
        onClick={() => setShowAd(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
      >
        Trigger Interstitial Break
      </button>

      <AdTogetherInterstitial
        adUnitId="${unitId}"
        isOpen={showAd}
        onClose={() => setShowAd(false)}
        closeDelay={3}
        onAdLoaded={() => console.log('Interstitial ready')}
        onAdFailedToLoad={(err) => console.error('Interstitial error:', err)}
      />
    </div>
  );
}`;
          }
        } else if (fw === "react-native") {
          if (adType === "banner") {
            snippet = `import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { AdTogether, AdTogetherBanner } from '@adtogether/react-native-sdk';

export function BannerExample() {
  useEffect(() => {
    AdTogether.initialize({ appId: '${appId}' });
  }, []);

  return (
    <View style={styles.container}>
      <AdTogetherBanner
        adUnitId="${unitId}"
        showCloseButton={true}
        onAdLoaded={() => console.log('Banner loaded')}
        onAdFailedToLoad={(err) => console.log('Banner error:', err)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center', marginVertical: 10 }
});`;
          } else {
            snippet = `import React, { useEffect, useState } from 'react';
import { View, Button } from 'react-native';
import { AdTogether, AdTogetherInterstitial } from '@adtogether/react-native-sdk';

export function InterstitialExample() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    AdTogether.initialize({ appId: '${appId}' });
  }, []);

  return (
    <View>
      <Button title="Show Ad" onPress={() => setIsOpen(true)} />
      <AdTogetherInterstitial
        adUnitId="${unitId}"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        closeDelay={3}
      />
    </View>
  );
}`;
          }
        } else if (fw === "android" || fw === "kotlin") {
          if (adType === "banner") {
            snippet = `package com.example.app

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.adtogether.sdk.AdTogether
import com.adtogether.sdk.views.AdTogetherBanner

// In your Application or MainActivity:
// AdTogether.initialize(context = this, appId = "${appId}")

@Composable
fun BannerPlacement() {
    Column(modifier = Modifier.fillMaxWidth()) {
        AdTogetherBanner(
            adUnitId = "${unitId}",
            showCloseButton = true,
            onAdLoaded = { println("Ad loaded") },
            onAdClosed = { println("Banner closed") },
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp)
        )
    }
}`;
          } else {
            snippet = `package com.example.app

import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import com.adtogether.sdk.AdTogether
import com.adtogether.sdk.views.AdTogetherInterstitial

@Composable
fun InterstitialPlacement() {
    var showAd by remember { mutableStateOf(false) }

    Button(onClick = { showAd = true }) {
        Text("Show Interstitial Ad")
    }

    if (showAd) {
        AdTogetherInterstitial(
            adUnitId = "${unitId}",
            onAdLoaded = { println("Ad loaded") },
            onDismiss = { showAd = false }
        )
    }
}`;
          }
        } else if (fw === "ios" || fw === "swift") {
          if (adType === "banner") {
            snippet = `import SwiftUI
import AdTogether

// In your App init:
// AdTogether.initialize(appId: "${appId}")

struct BannerPlacement: View {
    var body: some View {
        VStack {
            AdTogetherView(
                adUnitId: "${unitId}",
                showCloseButton: true,
                onAdLoaded: { print("Ad loaded") },
                onAdFailedToLoad: { err in print("Error: \\(err)") },
                onAdClosed: { print("Banner dismissed") }
            )
            .frame(height: 50)
        }
    }
}`;
          } else {
            snippet = `import SwiftUI
import AdTogether

struct InterstitialPlacement: View {
    @State private var showAd = false

    var body: some View {
        VStack {
            Button("Show Interstitial") {
                showAd = true
            }
        }
        .fullScreenCover(isPresented: $showAd) {
            AdTogetherInterstitialView(
                adUnitId: "${unitId}",
                closeDelay: 3,
                onAdLoaded: { print("Ad ready") },
                onAdFailedToLoad: { err in print("Error: \\(err)") }
            ) {
                showAd = false
            }
        }
    }
}`;
          }
        } else if (fw === "flutter" || fw === "dart") {
          if (adType === "banner") {
            snippet = `import 'package:flutter/material.dart';
import 'package:adtogether_sdk/adtogether_sdk.dart';

// In main():
// await AdTogether.initialize(appId: '${appId}');

class BannerPlacement extends StatelessWidget {
  const BannerPlacement({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AdTogetherBanner(
      adUnitId: '${unitId}',
      showCloseButton: true,
      size: AdSize.banner,
      onAdLoaded: () => debugPrint('Ad loaded'),
      onAdFailedToLoad: (err) => debugPrint('Error: \$err'),
      onAdClosed: () => debugPrint('Banner closed'),
    );
  }
}`;
          } else {
            snippet = `import 'package:flutter/material.dart';
import 'package:adtogether_sdk/adtogether_sdk.dart';

class InterstitialPlacement extends StatelessWidget {
  const InterstitialPlacement({Key? key}) : super(key: key);

  void _showAdBreak(BuildContext context) {
    AdTogetherInterstitial.show(
      context: context,
      adUnitId: '${unitId}',
      closeDelay: const Duration(seconds: 3),
      onAdLoaded: () => debugPrint('Interstitial ready'),
      onAdFailedToLoad: (err) => debugPrint('Error: \$err'),
      onAdClosed: () => debugPrint('Ad closed'),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () => _showAdBreak(context),
      child: const Text('Show Interstitial'),
    );
  }
}`;
          }
        }

        const noticePrefix = releasePending
          ? `${releasePending}\n\nDisplaying snippet for the current published version (${publishedVersion}):\n\n`
          : "";
        return {
          content: [{ type: "text", text: noticePrefix + (snippet || "// Snippet not available for the requested configuration.") }],
        };
      }

      // ----------------------------------------------------
      // 10. validate_ad_component (Public Utility Tool)
      // ----------------------------------------------------
      if (name === "validate_ad_component") {
        const { code = "" } = rawArgs;
        const issues: string[] = [];
        const warnings: string[] = [];

        // 1. Next.js 16 / React 19 Client Component Check
        if ((code.includes("import") && code.includes("@adtogether/web-sdk")) || code.includes("AdTogetherBanner") || code.includes("AdTogetherInterstitial")) {
          if (!code.includes('"use client"') && !code.includes("'use client'")) {
            warnings.push("NEXTJS 16 CONVENTION: In Next.js App Router, components rendering AdTogether SDK components or hooks must declare the '\"use client\";' directive at the top of the file.");
          }
        }

        // 2. React / Web SDK Import Check
        if (code.includes("AdTogetherBanner") || code.includes("AdTogetherInterstitial")) {
          if (code.includes("from '@adtogether/web-sdk'") && !code.includes("from '@adtogether/web-sdk/react'")) {
            issues.push("IMPORT ERROR: React ad components must be imported from '@adtogether/web-sdk/react', not '@adtogether/web-sdk'. Example: import { AdTogetherBanner } from '@adtogether/web-sdk/react';");
          }
        }

        // 3. Phantom / Deprecated API Checks
        if (code.includes("useInterstitial")) {
          issues.push("API ERROR: 'useInterstitial' hook does not exist. Use the <AdTogetherInterstitial> component with isOpen/onClose props.");
        }
        if (code.includes("AdTogetherBannerWidget")) {
          issues.push("API ERROR: 'AdTogetherBannerWidget' does not exist in Flutter SDK. Use 'AdTogetherBanner' instead.");
        }
        if (code.includes("apiKey:")) {
          warnings.push("DEPRECATION WARNING: 'apiKey' was deprecated in v0.4.0. Use 'appId' instead to match the dashboard.");
        }
        if (code.includes("unitId=") && !code.includes("adUnitId=") && (code.includes("AdTogetherBanner") || code.includes("AdTogetherInterstitial"))) {
          issues.push("PROP ERROR: The correct prop name is 'adUnitId', not 'unitId'. Using 'unitId' will fall back to 'default'.");
        }

        // 4. Critical Security Invariant: Banner vs Interstitial Separation
        const isWebBanner = code.includes("AdTogetherBanner") && !code.includes("AdTogetherBannerView") && !code.includes("AdTogetherInterstitial");
        const isWebInterstitial = code.includes("AdTogetherInterstitial") && (code.includes("isOpen") || code.includes("onClose"));
        const isAndroidBanner = code.includes("AdTogetherBanner") && (code.includes("import com.adtogether") || code.includes("@Composable"));
        const usesAndroidInterstitial = code.includes("AdTogetherInterstitial") && code.includes("onDismiss");
        const isIosBanner = code.includes("AdTogetherView") && (code.includes("import SwiftUI") || code.includes("import AdTogether"));
        const usesIosInterstitial = code.includes("AdTogetherInterstitialView") && code.includes("fullScreenCover");
        const isFlutterBanner = code.includes("AdTogetherBanner(") && code.includes("adtogether_sdk");
        const usesFlutterInterstitial = code.includes("AdTogetherInterstitial.show(");

        const isBanner = isWebBanner || isAndroidBanner || isFlutterBanner || isIosBanner;
        const usesInterstitial = isWebInterstitial || usesAndroidInterstitial || usesFlutterInterstitial || usesIosInterstitial;

        const isFetchingInterstitialInBannerCb =
          code.match(/onAdClosed[\s\S]*?AdTogetherInterstitial/i) ||
          code.match(/onAdLoaded[\s\S]*?AdTogetherInterstitial/i);

        if (isFetchingInterstitialInBannerCb) {
          issues.push("CRITICAL SECURITY INVARIANT VIOLATION: Loading or triggering an Interstitial ad inside a Banner callback (e.g. onAdClosed, onAdLoaded) is strictly prohibited. It creates false impression loops and triggers fraud filters.");
        } else if (isBanner && usesInterstitial) {
          issues.push("CRITICAL SECURITY INVARIANT VIOLATION: Banner components must NEVER fetch or embed Interstitial ads. This causes advertiser overcharge and payout fraud.");
        }

        // 5. Test ID check
        if (code.includes("test_banner_id") || code.includes("test_interstitial_id") || code.includes("ca-app-pub-3940256099942544")) {
          warnings.push("TEST ID WARNING: Sample or test adUnitId detected. Replace with your production AdTogether unit ID before deploying to production.");
        }

        // 6. Initialization check
        if ((isBanner || usesInterstitial) && !code.includes("AdTogether.initialize")) {
          warnings.push("INITIALIZATION NOTICE: Ensure 'AdTogether.initialize({ appId: \"...\" })' runs in your app root lifecycle before rendering ad components.");
        }

        const isValid = issues.length === 0;
        let report = "";
        if (isValid && warnings.length === 0) {
          report = "✅ PASSED: Code is valid and fully conforms to AdTogether SDK Security Invariants and modern framework standards.";
        } else if (isValid) {
          report = `✅ PASSED (with notices):\n- ${warnings.join("\n- ")}`;
        } else {
          report = `❌ VALIDATION FAILED:\nErrors:\n- ${issues.join("\n- ")}${warnings.length > 0 ? `\n\nWarnings:\n- ${warnings.join("\n- ")}` : ""}`;
        }

        return {
          content: [{ type: "text", text: report }],
        };
      }

      // ----------------------------------------------------
      // 11. diagnose_no_fill
      // ----------------------------------------------------
      if (name === "diagnose_no_fill") {
        const uid = requireAuth();
        const { unitId, bundleId, domain } = rawArgs;
        const checks: { check: string; status: string; detail: string }[] = [];

        // 1. Account & Credits Check
        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
          return {
            isError: true,
            content: [{ type: "text", text: "❌ CRITICAL: User account not found for this App ID. Please register at https://www.ad-together.org." }],
          };
        }
        const userData = userDoc.data()!;
        const credits = userData.credits || 0;
        if (credits <= 0) {
          checks.push({
            check: "Account Credits",
            status: "❌ FAIL",
            detail: `Balance is ${credits}. Ads will not serve without a positive credit balance. Top up credits in the dashboard or show ads in your app to earn credits.`,
          });
        } else {
          checks.push({ check: "Account Credits", status: "✅ PASS", detail: `Balance: ${credits} credits available.` });
        }

        // 2. Bundle ID Mismatch Check
        const registeredBundleId = userData.bundleId || null;
        if (bundleId && registeredBundleId) {
          if (bundleId !== registeredBundleId) {
            checks.push({
              check: "Bundle ID",
              status: "❌ FAIL",
              detail: `Mismatch detected. App sends "${bundleId}" but dashboard is set to "${registeredBundleId}". Update your app or dashboard config.`,
            });
          } else {
            checks.push({ check: "Bundle ID", status: "✅ PASS", detail: `Matches dashboard configuration ("${registeredBundleId}").` });
          }
        } else if (!registeredBundleId) {
          checks.push({
            check: "Bundle ID",
            status: "⚠️ WARN",
            detail: "No bundle ID registered in the dashboard. For mobile apps, configure your bundle ID in the settings tab.",
          });
        } else {
          checks.push({
            check: "Bundle ID",
            status: "ℹ️ INFO",
            detail: "No bundleId passed to check. Pass your app's bundle ID to verify alignment.",
          });
        }

        // 3. Authorized Domains Check (for web)
        const authorizedDomains: string[] = userData.authorizedDomains || [];
        if (domain) {
          if (authorizedDomains.length === 0) {
            checks.push({
              check: "Authorized Domains",
              status: "⚠️ WARN",
              detail: "No authorized domains configured. Web ads may be blocked on production URLs. Add your domain in the dashboard.",
            });
          } else if (!authorizedDomains.includes(domain)) {
            checks.push({
              check: "Authorized Domains",
              status: "❌ FAIL",
              detail: `Domain "${domain}" is not in authorized list [${authorizedDomains.join(", ")}]. Add it to the dashboard.`,
            });
          } else {
            checks.push({ check: "Authorized Domains", status: "✅ PASS", detail: `Domain "${domain}" is authorized.` });
          }
        } else {
          checks.push({ check: "Authorized Domains", status: "ℹ️ INFO", detail: "No domain provided to verify (applicable to web apps)." });
        }

        // 4. Campaign Inventory Check
        const campaignSnap = await db.collection("ads").where("ownerUid", "==", uid).where("active", "==", true).get();
        if (campaignSnap.empty) {
          checks.push({
            check: "Active Campaigns",
            status: "❌ FAIL",
            detail: "No active campaigns found in your account. Create or activate a campaign in the dashboard so other apps can exchange traffic.",
          });
        } else {
          checks.push({ check: "Active Campaigns", status: "✅ PASS", detail: `${campaignSnap.size} active campaign(s) running.` });

          if (unitId) {
            const match = campaignSnap.docs.find((d: any) => d.data().unitId === unitId);
            if (!match) {
              checks.push({
                check: "Unit ID Match",
                status: "⚠️ WARN",
                detail: `None of your active campaigns specifically target unit ID "${unitId}".`,
              });
            } else {
              checks.push({ check: "Unit ID Match", status: "✅ PASS", detail: `Campaign "${match.id}" is assigned to unit "${unitId}".` });
            }
          }
        }

        // 5. Recent SDK Errors Check
        const errorsSnap = await db
          .collection("sdkErrors")
          .where("uid", "==", uid)
          .orderBy("timestamp", "desc")
          .limit(5)
          .get()
          .catch(() => null);

        if (errorsSnap && !errorsSnap.empty) {
          const errs = errorsSnap.docs.map((d: any) => `[${d.data().code || "ERR"}] ${d.data().message || "Unknown error"}`);
          checks.push({
            check: "Recent SDK Errors",
            status: "⚠️ WARN",
            detail: `${errorsSnap.size} recent error(s) logged:\n  - ${errs.join("\n  - ")}`,
          });
        } else {
          checks.push({ check: "Recent SDK Errors", status: "✅ PASS", detail: "No recent errors logged by client SDKs." });
        }

        const hasFailures = checks.some((c) => c.status.includes("FAIL"));
        const hasWarnings = checks.some((c) => c.status.includes("WARN"));
        let header = "";
        if (hasFailures) {
          header = "❌ DIAGNOSIS: Found blocking issues preventing ads from filling.\n";
        } else if (hasWarnings) {
          header = "⚠️ DIAGNOSIS: No hard blockers found, but warnings require attention.\n";
        } else {
          header = "✅ DIAGNOSIS: All integration checks passed. If ads do not render immediately, verify network connectivity and SDK initialization.\n";
        }

        const report = header + "\n" + checks.map((c) => `${c.status} ${c.check}\n   ${c.detail}`).join("\n\n");
        return {
          content: [{ type: "text", text: report }],
        };
      }

      // ----------------------------------------------------
      // 12. check_sdk_version (Public Utility Tool)
      // ----------------------------------------------------
      if (name === "check_sdk_version") {
        const { platform, currentVersion = "" } = rawArgs;
        const plat = (platform || "").toLowerCase();
        const releasePending = sdkReleasePendingNotice();

        const latestVersions: Record<string, { version: string; changelog: string; upgradeCmd: string }> = {
          web: {
            version: "0.5.9",
            changelog: "0.5.9: Release v0.5.9 across all platforms.\n0.5.8: Synchronized the SDK release version across platforms.\n0.5.7: Synchronized the SDK release version across platforms.\n0.5.6: Safely encodes ad-serve parameters, rejects mismatched ad types, removes client country reporting, and records one-second viewability telemetry.\n0.5.0: Current release.\n0.4.0: Standardized appId.",
            upgradeCmd: "npm install @adtogether/web-sdk@latest",
          },
          "react-native": {
            version: "0.5.9",
            changelog: "0.5.9: Release v0.5.9 across all platforms.\n0.5.8: Synchronized the SDK release version across platforms.\n0.5.7: Synchronized the SDK release version across platforms.\n0.5.6: Safely encodes ad-serve parameters, rejects mismatched ad types, removes client country reporting, and records one-second viewability telemetry.\n0.5.0: Parity update.\n0.4.0: Standardized appId.",
            upgradeCmd: "npm install @adtogether/react-native-sdk@latest",
          },
          android: {
            version: "0.5.9",
            changelog: "0.5.9: Release v0.5.9 across all platforms.\n0.5.8: Synchronized the SDK release version across platforms.\n0.5.7: Synchronized the SDK release version across platforms.\n0.5.6: Safely encodes ad-serve parameters, rejects mismatched ad types, removes client country reporting, and records one-second viewability telemetry.\n0.5.5: Added Play Integrity grant verification with a warmed, reused provider.\n0.5.0: Renamed Maven artifact to com.relaxsoftwareapps.adtogether:adtogether-sdk.",
            upgradeCmd: 'implementation("com.relaxsoftwareapps.adtogether:adtogether-sdk:0.5.9")',
          },
          flutter: {
            version: "0.5.9",
            changelog: "0.5.9: Release v0.5.9 across all platforms.\n0.5.8: Synchronized the SDK release version across platforms.\n0.5.7: Removed an unnecessary cast to pass static analysis.\n0.5.6: Safely encodes ad-serve parameters, rejects mismatched ad types, removes client country reporting, and records one-second viewability telemetry.\n0.5.4: Fixed ad image cropping (BoxFit.contain) with theme-aware letterboxing.\n0.5.0: Removed package_info_plus dependency.",
            upgradeCmd: "flutter pub add adtogether_sdk:^0.5.9",
          },
          ios: {
            version: "0.5.9",
            changelog: "0.5.9: Release v0.5.9 across all platforms.\n0.5.8: Synchronized the SDK release version across platforms.\n0.5.7: Synchronized the SDK release version across platforms.\n0.5.6: Safely encodes ad-serve parameters, rejects mismatched ad types, removes client country reporting, and records one-second viewability telemetry.\n0.5.5: Added App Attest grant assertions and resilient key registration.\n0.5.0: Added root Package.swift for Swift Package Manager.",
            upgradeCmd: "pod 'AdTogether', '~> 0.5.9' (or SPM version 0.5.9)",
          },
        };

        const info = latestVersions[plat];
        if (!info) {
          return {
            isError: true,
            content: [{ type: "text", text: `Unknown platform "${platform}". Supported platforms: web, react-native, android, flutter, ios.` }],
          };
        }

        const publishedVersion = getPublishedSdkVersion();
        const effectiveVersion = releasePending ? publishedVersion : info.version;

        // Clean user version string: strip ^, ~, v, etc.
        const cleanCurrent = currentVersion.replace(/^[v^~]/, "").split("-")[0].trim();
        const currentParts = cleanCurrent.split(".").map((n: string) => parseInt(n, 10) || 0);
        const latestParts = effectiveVersion.split(".").map(Number);

        const isUpToDate =
          currentParts[0] === latestParts[0] &&
          currentParts[1] === latestParts[1] &&
          currentParts[2] === latestParts[2];

        const isMajorBehind = latestParts[0] > (currentParts[0] || 0);
        const isMinorBehind = latestParts[1] > (currentParts[1] || 0);

        let upgradeCmd = info.upgradeCmd;
        if (releasePending) {
          if (plat === "android") {
            upgradeCmd = `implementation("com.relaxsoftwareapps.adtogether:adtogether-sdk:${effectiveVersion}")`;
          } else if (plat === "flutter") {
            upgradeCmd = `flutter pub add adtogether_sdk:^${effectiveVersion}`;
          } else if (plat === "ios") {
            upgradeCmd = `pod 'AdTogether', '~> ${effectiveVersion}' (or SPM version ${effectiveVersion})`;
          }
        }

        let report = "";
        if (isUpToDate) {
          report = `✅ You are using the latest published version (${effectiveVersion}) of the ${platform} SDK.`;
        } else {
          const severity = isMajorBehind ? "❌ CRITICAL" : isMinorBehind ? "⚠️ IMPORTANT" : "ℹ️ UPDATE AVAILABLE";
          report = `${severity}: Your ${platform} SDK version (${currentVersion || "unknown"}) is outdated relative to the published line (${effectiveVersion}).\n\n` +
            `Published Version: ${effectiveVersion}\n\n` +
            `Changelog:\n${info.changelog}\n\n` +
            `Upgrade Command:\n${upgradeCmd}`;
        }

        if (releasePending) {
          report = `${releasePending}\n\n${report}`;
        }

        return {
          content: [{ type: "text", text: report }],
        };
      }

      // ----------------------------------------------------
      // 13. get_revenue_breakdown
      // ----------------------------------------------------
      if (name === "get_revenue_breakdown") {
        const uid = requireAuth();
        const period = rawArgs.period || "30d";

        const userDoc = await db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
          return {
            isError: true,
            content: [{ type: "text", text: "User account not found." }],
          };
        }

        const userData = userDoc.data()!;
        const earningsLog: Record<string, any> = userData.earningsLog || {};

        const now = new Date();
        let cutoff = new Date(0);
        if (period === "today") cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        else if (period === "7d") cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (period === "30d") cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let totalEarned = 0;
        let bannerEarned = 0;
        let interstitialEarned = 0;
        const byCampaign: Record<string, { earned: number; impressions: number; adType: string }> = {};

        for (const [, entry] of Object.entries(earningsLog)) {
          const entryDate = entry.date ? new Date(entry.date) : (entry.timestamp?.toDate?.() || new Date(0));
          if (entryDate < cutoff) continue;

          const earned = Number(entry.creditsEarned) || 0;
          totalEarned += earned;

          const type = (entry.adType || "banner").toLowerCase();
          if (type === "banner") bannerEarned += earned;
          else if (type === "interstitial") interstitialEarned += earned;

          const cId = entry.campaignId || entry.adId || "general";
          if (!byCampaign[cId]) {
            byCampaign[cId] = { earned: 0, impressions: 0, adType: type };
          }
          byCampaign[cId].earned += earned;
          byCampaign[cId].impressions += Number(entry.impressions) || 1;
        }

        const periodLabel = period === "today" ? "Today" : period === "7d" ? "Last 7 Days" : period === "30d" ? "Last 30 Days" : "All Time";
        let report = `📊 AdTogether Earnings Report — ${periodLabel}\n`;
        report += `${"═".repeat(40)}\n\n`;
        report += `Total Credits Earned: ${totalEarned}\n`;
        report += `  • Banner Ads:       ${bannerEarned} credits (${totalEarned > 0 ? Math.round((bannerEarned / totalEarned) * 100) : 0}%)\n`;
        report += `  • Interstitials:    ${interstitialEarned} credits (${totalEarned > 0 ? Math.round((interstitialEarned / totalEarned) * 100) : 0}%)\n\n`;

        const topCampaigns = Object.entries(byCampaign).sort((a, b) => b[1].earned - a[1].earned);
        if (topCampaigns.length > 0) {
          report += `Breakdown by Campaign:\n`;
          for (const [id, stats] of topCampaigns.slice(0, 10)) {
            report += `  - ${id} (${stats.adType}): ${stats.earned} credits, ${stats.impressions} impressions\n`;
          }
        } else {
          report += `No earnings recorded for this period.\n`;
        }

        return {
          content: [{ type: "text", text: report }],
        };
      }

      // ----------------------------------------------------
      // 14. migrate_from_admob (Public Utility Tool)
      // ----------------------------------------------------
      if (name === "migrate_from_admob") {
        const releasePending = sdkReleasePendingNotice();
        const publishedVersion = getPublishedSdkVersion();

        const { code = "" } = rawArgs;
        let suggestion = "";

        if (code.includes("BannerAd") || code.includes("react-native-google-mobile-ads")) {
          suggestion = `Migrating React / React Native from AdMob:
1. Replace 'react-native-google-mobile-ads' with '@adtogether/react-native-sdk' (mobile) or '@adtogether/web-sdk/react' (web).
2. Replace <BannerAd size={...} unitId={...} /> with:
   <AdTogetherBanner adUnitId="home_banner" showCloseButton={true} />
3. Initialize in your App root:
   AdTogether.initialize({ appId: 'YOUR_APP_ID' });`;
        } else if (code.includes("InterstitialAd")) {
          suggestion = `Migrating Interstitials from AdMob:
1. Replace imperative AdMob loading with declarative <AdTogetherInterstitial />.
2. Example:
   <AdTogetherInterstitial
     adUnitId="level_complete"
     isOpen={showAd}
     onClose={() => setShowAd(false)}
     closeDelay={3}
   />`;
        } else if (code.includes("AdView") || code.includes("com.google.android.gms.ads")) {
          suggestion = `Migrating Android Kotlin from AdMob:
1. Replace AdMob dependency with: implementation("com.relaxsoftwareapps.adtogether:adtogether-sdk:${publishedVersion}")
2. Replace XML AdView with Jetpack Compose AdTogetherBanner:
   AdTogetherBanner(
       adUnitId = "home_banner",
       modifier = Modifier.fillMaxWidth().height(80.dp)
   )`;
        } else if (code.includes("google_mobile_ads") || code.includes("AdWidget")) {
          suggestion = `Migrating Flutter from AdMob:
1. In pubspec.yaml, replace google_mobile_ads with: adtogether_sdk: ^${publishedVersion}
2. Replace AdWidget with:
   AdTogetherBanner(
     adUnitId: 'home_banner',
     showCloseButton: true,
   )`;
        } else if (code.includes("GADBannerView") || code.includes("GoogleMobileAds")) {
          suggestion = `Migrating iOS Swift from AdMob:
1. Add AdTogether SPM package or CocoaPod: pod 'AdTogether', '~> ${publishedVersion}'
2. Replace GADBannerView with SwiftUI:
   AdTogetherView(adUnitId: "home_banner", showCloseButton: true)
       .frame(height: 50)`;
        } else {
          suggestion = `General AdMob to AdTogether Migration Steps:
1. Initialize AdTogether: AdTogether.initialize({ appId: 'YOUR_APP_ID' })
2. Replace banner components with AdTogetherBanner (or AdTogetherView on iOS).
3. Replace interstitial handlers with AdTogetherInterstitial.
4. Verify your integration with the validate_ad_component tool.`;
        }

        const noticePrefix = releasePending
          ? `${releasePending}\n\nDisplaying migration advice for the current published version (${publishedVersion}):\n\n`
          : "";
        return {
          content: [{ type: "text", text: noticePrefix + (suggestion || "Please supply AdMob code to get specific migration instructions.") }],
        };
      }

      throw new Error(`Tool not found: ${name}`);
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error executing ${name}: ${error?.message || String(error)}` }],
      };
    }
  });

  return server;
}
