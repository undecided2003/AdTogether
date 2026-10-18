/**
 * Comprehensive Bot, Crawler, and Indexer Detection
 *
 * AdTogether serves ads exclusively to genuine human traffic. Automated web crawlers,
 * search engine indexers (Google WRS, Meta webindexer, Naver Yeti, Bingbot, etc.),
 * and headless scrapers executing client-side JavaScript must never consume advertiser
 * credits, pollute metrics, or trigger billable Firestore reads and writes.
 */

import { isIP } from 'node:net';

type HeaderReader = Pick<Headers, 'get'>;

// Dedicated crawler, spider, and indexer CIDR/IP prefixes.
// Real human consumers never connect through these crawler subnets.
// CRITICAL: NEVER include generic cloud, CDN, or reverse-proxy subnets (e.g. Google Cloud GFE /
// Firebase Hosting proxies) as that blocks 100% of legitimate proxied traffic.
const CRAWLER_IP_PREFIXES = [
  // Meta / Facebook webindexers & crawlers (ASN 32934)
  '31.13.',
  '157.240.',
  '173.252.',
  '69.63.',
  '69.171.',

  // Microsoft Bingbot crawler infrastructure
  '40.77.',
  '157.55.',
  '207.46.',
];

// Known crawler, spider, and automated indexer user-agent tokens (case-insensitive)
const KNOWN_BOT_PATTERNS = [
  // --- Universal Crawler & Bot Indicators (100% Bots, 0% Humans) ---
  // RFC 9309 / Standard Robot Documentation URI (e.g. (+https://...) or (+http://...))
  // All polite web crawlers and indexers document themselves with a URL.
  // Genuine human web browsers NEVER contain a URL in their User-Agent.
  /\+https?:\/\//i,
  // URLs embedded anywhere in User-Agent (real browsers never include URLs)
  /\bhttps?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i,
  // Contact email addresses embedded in User-Agent (common in polite crawlers)
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  // Generic bot tokens with strict negative lookbehinds (guarantees Cubot/Robot/Talbot are safe)
  /(?<![a-z0-9]|cu|tal|ro)bots?(?![a-z0-9])/i,
  /(?<![a-z0-9])(?:spider|crawler|scraper|scanner|probe|archiver|transcoder|fetcher|indexer)(?![a-z0-9])/i,
  /[a-z0-9_-]+(?:bot|spider|crawler|scraper|scanner)\/[0-9]/i,
  /[-_]bot\b/i,
  /\bsearchbot\b/i,

  // --- Search Engine Spiders & Crawlers ---
  // Google
  /googlebot/i,
  /google-read-aloud/i,
  /mediapartners-google/i,
  /adsbot-google/i,
  /feedfetcher-google/i,
  /google-site-verification/i,
  /google-safety/i,
  /google-inspectiontool/i,
  /storebot-google/i,
  /google-adstxt/i,
  /googleweblight/i,
  /duplexweb-google/i,
  /googleother/i,
  /googleproducer/i,
  /google-extended/i,
  /google-cloudvertexai/i,
  /google-vertexai/i,
  /appengine-google/i,
  // Google WRS specifically renders JavaScript with this exact frozen UA string
  /chrome\/99\.0\.4844\.51/i,

  // Microsoft Bing & MSN
  /bingbot/i,
  /msnbot/i,
  /bingpreview/i,
  /adidxbot/i,

  // Yahoo & DuckDuckGo
  /slurp/i,
  /yahoo! slurp/i,
  /duckduckbot/i,
  /duckassistbot/i,

  // Baidu, Yandex, Sogou, Seznam, Qwant, Mojeek, CocCoc
  /baiduspider/i,
  /yandex(bot|images|render|accessibility|video|media|blogs|favicons|webmaster|metrika)?/i,
  /sogou/i,
  /seznambot/i,
  /qwantify/i,
  /mojeekbot/i,
  /coccocbot/i,
  /mail\.ru_bot/i,

  // Korean Search Engine Spiders (strictly distinct from consumer apps)
  /daumoa/i,                  // Daum web search crawler (NOT consumer Daum app)
  /yeti/i,                    // Naver search engine crawler (NOT consumer Naver in-app)

  // Other Regional & Global Crawlers
  /exabot/i,
  /bytespider/i,
  /byterover/i,
  /bytedance/i,
  /petalbot/i,
  /aspigel/i,
  /applebot/i,
  /yisouspider/i,

  // --- AI & LLM Training, Search, & Retrieval Bots ---
  /gptbot/i,
  /chatgpt-user/i,
  /oai-searchbot/i,
  /claude-web/i,
  /claudebot/i,
  /claude-code/i,
  /anthropic-ai/i,
  /perplexitybot/i,
  /perplexity-search/i,
  /cohere-ai/i,
  /cohere-training-data-crawler/i,
  /deepseek/i,
  /mistralbot/i,
  /amazonbot/i,
  /ccbot/i,
  /diffbot/i,
  /youbot/i,
  /timpibot/i,
  /kagibot/i,
  /webz\.io/i,
  /omgili/i,
  /phindbot/i,
  /perseabot/i,
  /proximic/i,

  // --- Social Media Link Unfurlers & Indexers ---
  /meta-webindexer/i,
  /meta-externalagent/i,
  /meta-externalfetcher/i,
  /facebookexternalhit/i,
  /facebot/i,
  /facebookbot/i,
  /facebookcatalog/i,
  /twitterbot/i,
  /xbot/i,
  /linkedinbot/i,
  /pinterestbot/i,
  /pinterest\//i,
  /slackbot/i,
  /slack-imgproxy/i,
  /telegrambot/i,
  /discordbot/i,
  /skypeuripreview/i,
  /redditbot/i,
  /whatsapp/i,
  /flipboardproxy/i,
  /bitlybot/i,
  /tumblr\//i,
  /linespider/i,

  // --- SEO, Auditing, & Monitoring Scrapers ---
  /semrush/i,                 // Matches SemrushBot, SplitSignalBot
  /ahrefs/i,                  // Matches AhrefsBot, AhrefsSiteAudit
  /mj12bot/i,
  /dotbot/i,
  /rogerbot/i,
  /screaming frog/i,
  /sitebulb/i,
  /dataforseo/i,
  /serpstatbot/i,
  /spyfu/i,
  /rytebot/i,
  /oncrawl/i,
  /deepcrawl/i,
  /lumar/i,
  /brightedge/i,
  /lighthouse/i,
  /pagespeed/i,
  /chrome-lighthouse/i,
  /gtmetrix/i,
  /webpagetest/i,
  /uptimerobot/i,
  /pingdom/i,
  /site24x7/i,
  /statuscake/i,
  /betteruptime/i,
  /datadog/i,
  /newrelic/i,
  /w3c_validator/i,
  /w3c_css_validator/i,

  // --- Headless Automation Browsers & Engines ---
  /\bheadless\b/i,
  /headlesschrome/i,
  /headlessfirefox/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /cypress/i,
  /webdriver/i,
  /casperjs/i,
  /slimerjs/i,
  /nightmare/i,
  /splash/i,
  /htmlunit/i,
  /zombie/i,
  // DevTools / Puppeteer default device emulation presets (obsolete hardware/iOS strings)
  /(?:iPhone OS|CPU OS)\s*13_2_3\b/i,
  /\bVersion\/13\.0\.3(?:\.[0-9]+)?\s+Mobile\/[0-9a-z]+\s+Safari\/604\.1\b/i,
  /\bNexus 5X\b/i,
  /\bSM-G900P\b/i,
  /\bMoto G \([0-9]\)/i,

  // --- Scripting HTTP Clients, Libraries, & Feed Aggregators ---
  /curl\//i,
  /wget\//i,
  /httpie/i,
  /apachebench/i,
  /wrk\//i,
  /jmeter/i,
  /python-requests/i,
  /python-urllib/i,
  /aiohttp/i,
  /httpx/i,
  /scrapy/i,
  /beautifulsoup/i,
  /go-http-client/i,
  /node-fetch/i,
  /undici/i,
  /axios\//i,
  /got\//i,
  /superagent/i,
  /okhttp/i,
  /apache-httpclient/i,
  /jersey\//i,
  /java\//i,
  /guzzlehttp/i,
  /faraday/i,
  /libwww-perl/i,
  /lwp-/i,
  /postmanruntime/i,
  /insomnia/i,
  /paw\//i,
  /feedly/i,
  /inoreader/i,
  /newsblur/i,

  // --- Archivers, Downloaders & Security Scanners ---
  /ia_archiver/i,
  /archive\.org_bot/i,
  /wayback machine/i,
  /teleport/i,
  /httrack/i,
  /offline explorer/i,
  /sitesucker/i,
  /nessus/i,
  /nikto/i,
  /nmap/i,
  /zgrab/i,
  /masscan/i,
  /shodan/i,
  /censys/i,
  /sqlmap/i,
  /nuclei/i,
  /acunetix/i,
  /netsparker/i,
  /openvas/i,
  /burpcollaborator/i,
  /leakix/i,
  /l9scan/i,
  /wpscan/i,
  /\brust[_-]?sniffer\b/i,
];

export interface BotCheckResult {
  isBot: boolean;
  reason?: string;
}

/**
 * Normalizes an IP string: strips IPv6-mapped prefixes (::ffff:), brackets, quotes,
 * and port numbers.
 */
export function normalizeClientIp(rawIp: string | null | undefined): string | null {
  if (!rawIp || typeof rawIp !== 'string') return null;
  let candidate = rawIp.trim();
  // Strip quotes and brackets
  candidate = candidate.replace(/^["'\[]+|["'\]]+$/g, '');
  // Strip port if IPv4 with port: e.g. 66.249.93.193:8080
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(candidate)) {
    candidate = candidate.split(':')[0];
  }
  candidate = candidate.replace(/^::ffff:/i, '');
  return candidate && isIP(candidate) !== 0 ? candidate : null;
}

/**
 * Resolves the singular, un-spoofed client IP.
 * Priority: explicitly provided validated clientIp, or first entry in x-forwarded-for.
 * Intermediate reverse proxies are NEVER treated as client IPs.
 */
export function getClientIp(
  reqHeaders?: HeaderReader | null,
  directIp?: string | null
): string | null {
  if (directIp) {
    const norm = normalizeClientIp(directIp);
    if (norm) return norm;
  }

  if (!reqHeaders || typeof reqHeaders.get !== 'function') {
    return null;
  }

  // Cloud CDN / reverse proxy client IP headers (take single client IP, never proxy chain)
  const directHeaders = ['cf-connecting-ip', 'fastly-client-ip', 'true-client-ip', 'x-real-ip', 'x-appengine-user-ip'];
  for (const h of directHeaders) {
    const val = reqHeaders.get(h);
    if (val) {
      const norm = normalizeClientIp(val);
      if (norm) return norm;
    }
  }

  // x-forwarded-for: <client_ip>, <proxy_1>, <proxy_2>
  // MUST strictly take the FIRST entry only.
  const xff = reqHeaders.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    const norm = normalizeClientIp(first);
    if (norm) return norm;
  }

  return null;
}

/**
 * Check if an incoming request originates from a known bot, search crawler, or headless browser.
 * Checks the User-Agent string and the validated client IP against dedicated crawler infrastructure.
 */
export function isBotTraffic(
  userAgent: string | null | undefined,
  reqHeaders?: HeaderReader | null,
  clientIp?: string | null
): BotCheckResult {
  if (!userAgent || typeof userAgent !== 'string' || !userAgent.trim()) {
    return { isBot: true, reason: 'missing_user_agent' };
  }

  const trimmedUa = userAgent.trim();

  // Short, trivial, or placeholder fake user-agents
  if (trimmedUa.length < 10 || /^(?:empty|null|undefined|none|test|dummy|-+)$/i.test(trimmedUa)) {
    return { isBot: true, reason: 'invalid_user_agent_format' };
  }

  // 1. Check against known bot regex patterns
  for (const pattern of KNOWN_BOT_PATTERNS) {
    if (pattern.test(trimmedUa)) {
      return { isBot: true, reason: `known_bot_pattern: ${pattern.source}` };
    }
  }

  // 2. Resolve validated client IP (STRICTLY the client, NEVER proxy chain)
  const resolvedIp = getClientIp(reqHeaders, clientIp);

  // 3. Crawler & Spider IP Subnet Matching on validated client IP only
  if (resolvedIp) {
    for (const prefix of CRAWLER_IP_PREFIXES) {
      if (resolvedIp.startsWith(prefix)) {
        return { isBot: true, reason: `crawler_ip_subnet: ${prefix}` };
      }
    }
  }

  return { isBot: false };
}
