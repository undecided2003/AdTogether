# Edge & Cloudflare WAF Rate Limiting (Option C)

This guide documents the Edge / Reverse Proxy frequency capping configuration for AdTogether. It enforces the multi-layer defense strategy:
- **Client-Side:** `@adtogether/web-sdk` (Option A)
- **Server In-Memory:** `src/lib/web-frequency-limit.ts` (Option B)
- **Edge / Reverse Proxy:** Upstash Redis & Cloudflare WAF (Option C)

Limits enforced across rolling windows:
- **Max Views Per Hour:** `3` (rolling 60 minutes / 3600 seconds)
- **Max Views Per Day:** `12` (rolling 24 hours / 86400 seconds)

---

## 1. Upstash Redis Edge Integration

The backend in [`src/lib/web-frequency-limit.ts`](file:///c:/Users/kevin/Next/AdTogether/src/lib/web-frequency-limit.ts) natively supports Upstash Redis via atomic sorted-set HTTPS REST pipelines. It operates with **zero npm dependencies** and introduces **zero Firestore reads or writes**.

### Environment Setup
Add these environment variables to your deployment environment (Vercel, Cloud Run, Firebase App Hosting, or `.env.local`):

```env
# Upstash REST Credentials (from https://console.upstash.com)
UPSTASH_REDIS_REST_URL="https://your-upstash-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_rest_token"

# Optional overrides (defaults to 3 and 12)
WEB_MAX_VIEWS_PER_HOUR=3
WEB_MAX_VIEWS_PER_DAY=12
ENABLE_WEB_FREQUENCY_LIMIT=true
```

### How It Works
1. When a web client requests `/api/ads/serve` or `/api/ads/impression`, the server runs an atomic pipeline:
   - `ZREMRANGEBYSCORE` removes timestamps older than 1h / 24h.
   - `ZCARD` counts active views within the rolling window.
2. If `hourlyCount >= 3` or `dailyCount >= 12`, the request is immediately rejected with HTTP `429 Too Many Requests` (or uncredited status on impression) before querying Firestore.
3. **Fault-Tolerant Fallback:** If Upstash is not configured or times out (>1s), it automatically falls back to the in-memory limiter ([Option B](file:///c:/Users/kevin/Next/AdTogether/src/lib/web-frequency-limit.ts#L36-L105)) so legitimate users are never blocked.

---

## 2. Cloudflare WAF Custom Rate Limiting Rules

If AdTogether is proxied behind Cloudflare (with `TRUSTED_GEO_PROVIDER=cloudflare`), you can terminate abusive web traffic at Cloudflare's Edge PoPs before it ever reaches your Next.js application server.

### Dashboard Configuration

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Security** → **WAF** → **Rate limiting rules**.
2. Click **Create rule**.

#### Rule 1: Hourly Web View Limit
- **Rule Name:** `AdTogether Web View Limit (Hourly)`
- **When incoming requests match:**
  - Field: `URI Path` `is in` `{"/api/ads/serve" "/api/ads/impression"}`
  - AND `URI Query String` `contains` `"platform=web"` OR `Header` `Origin` `is not empty`
- **Rate Limiting Criteria:**
  - Characteristics: `IP Address`
  - Requests: `4` (Allows 3 impressions + 1 serve buffer)
  - Period: `3600 seconds` (1 hour)
- **Action:**
  - Action: `Block`
  - Response type: `Custom response`
  - Status code: `429`
  - Response body: `{"error":"Too Many Requests","message":"Hourly web view limit reached"}`

#### Rule 2: Daily Web View Limit
- **Rule Name:** `AdTogether Web View Limit (Daily)`
- **When incoming requests match:**
  - Same path & query expression as above.
- **Rate Limiting Criteria:**
  - Characteristics: `IP Address`
  - Requests: `14` (Allows 12 impressions + 2 serve buffer)
  - Period: `86400 seconds` (24 hours)
- **Action:**
  - Action: `Block`
  - Status code: `429`
  - Response body: `{"error":"Too Many Requests","message":"Daily web view limit reached"}`

---

### Cloudflare Ruleset API (cURL)

You can also apply this rule directly via the Cloudflare Rulesets API:

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/rulesets/phases/http_ratelimit/entrypoint" \
     -H "Authorization: Bearer YOUR_CLOUDFLARE_API_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{
       "rules": [
         {
           "action": "block",
           "description": "AdTogether Web View Limit (Hourly)",
           "expression": "(http.request.uri.path in {\"/api/ads/serve\" \"/api/ads/impression\"} and (http.request.uri.query contains \"platform=web\" or http.request.headers[\"origin\"][0] ne \"\"))",
           "ratelimit": {
             "characteristics": ["cf.client_ip"],
             "period": 3600,
             "requests_per_period": 4,
             "mitigation_timeout": 3600
           },
           "action_parameters": {
             "response": {
               "status_code": 429,
               "content_type": "application/json",
               "content": "{\"error\":\"Too Many Requests\",\"message\":\"Hourly web view limit reached\"}"
             }
           }
         }
       ]
     }'
```

---

## Summary of Protection Layers

| Layer | Implementation | Where It Runs | Firestore Reads Saved |
| :--- | :--- | :--- | :--- |
| **Option A (Client)** | `@adtogether/web-sdk` (`FrequencyCap.ts`) | Browser `localStorage` | 100% of network requests avoided when capped |
| **Option B (Server)** | `src/lib/web-frequency-limit.ts` | Node.js process memory | 3–4 reads per skipped impression |
| **Option C (Edge/Upstash)** | Upstash Redis pipeline | Distributed Serverless Edge | 3–4 reads per impression across all instances |
| **Option C (WAF)** | Cloudflare WAF Rate Limiting | Global CDN Edge (Cloudflare) | Terminated before reaching Next.js server |
