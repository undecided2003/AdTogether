<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SDK Security Invariants
Critical: Always adhere to the architectural decisions documented in [SDK_SECURITY_INVARIANTS.md](file:///c:/Users/kevin/Next/AdTogether/docs/SDK_SECURITY_INVARIANTS.md). Specifically, ensure banner components never accidentally fetch or render interstitial ads, as this causes payout fraud.
