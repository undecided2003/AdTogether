(function () {
  // 1. Detect base URL dynamically based on where the script is hosted
  // This allows it to work on any origin where the SDK is hosted, defaulting to www.ad-together.org in prod.
  const scriptElement = document.currentScript || document.querySelector('script[src*="sdk.js"]');
  const baseUrl = scriptElement ? new URL(scriptElement.src).origin : 'https://www.ad-together.org';
  const viewabilityTimers = new Map();
  const observedAdContainers = new Set();

  const safeHttpUrl = (value) => {
    if (typeof value !== 'string' || value.length === 0) return null;
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch (_) {
      return null;
    }
  };

  const safeText = (value) => (typeof value === 'string' ? value : '');

  const isAutomatedBrowser = () => {
    try {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;
      if (navigator.webdriver === true) return true;
      const nav = navigator;
      if ('callPhantom' in window || '_phantom' in window || '__nightmare' in window) return true;
      if ('__playwright' in window || '__puppeteer_evaluation_script__' in window) return true;
      if ('Cypress' in window) return true;
      if (window.outerWidth === 0 && window.outerHeight === 0) return true;
      if (Array.isArray(nav.languages) && nav.languages.length === 0) return true;
      const ua = nav.userAgent || '';
      if (!ua.trim() || ua.length < 10 || /^(?:empty|null|undefined|none|test|dummy|-+)$/i.test(ua.trim())) return true;
      if (
        /\+https?:\/\//i.test(ua) ||
        /\bhttps?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(ua) ||
        /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(ua) ||
        /(?<![a-z0-9]|cu|tal|ro)bots?(?![a-z0-9])/i.test(ua) ||
        /(?<![a-z0-9])(?:spider|crawler|scraper|scanner|probe|archiver|transcoder|fetcher|indexer)(?![a-z0-9])/i.test(ua) ||
        /[a-z0-9_-]+(?:bot|spider|crawler|scraper|scanner)\/[0-9]/i.test(ua) ||
        /[-_]bot\b/i.test(ua) ||
        /\bsearchbot\b/i.test(ua) ||
        /\bheadless\b/i.test(ua) ||
        /(?:iPhone OS|CPU OS)\s*13_2_3\b/i.test(ua) ||
        /\bVersion\/13\.0\.3(?:\.[0-9]+)?\s+Mobile\/[0-9a-z]+\s+Safari\/604\.1\b/i.test(ua) ||
        /\bNexus 5X\b/i.test(ua) ||
        /\bSM-G900P\b/i.test(ua) ||
        /\bMoto G \([0-9]\)/i.test(ua) ||
        /leakix/i.test(ua) ||
        /l9scan/i.test(ua) ||
        /wpscan/i.test(ua) ||
        /\brust[_-]?sniffer\b/i.test(ua) ||
        /googlebot/i.test(ua) ||
        /google-read-aloud/i.test(ua) ||
        /mediapartners-google/i.test(ua) ||
        /meta-webindexer/i.test(ua) ||
        /meta-externalagent/i.test(ua) ||
        /meta-externalfetcher/i.test(ua) ||
        /facebookexternalhit/i.test(ua) ||
        /facebookbot/i.test(ua) ||
        /bingbot/i.test(ua) ||
        /baiduspider/i.test(ua) ||
        /yandex(bot|images|render)?/i.test(ua) ||
        /daumoa/i.test(ua) ||
        /yeti/i.test(ua) ||
        /bytespider/i.test(ua) ||
        /petalbot/i.test(ua) ||
        /applebot/i.test(ua) ||
        /gptbot/i.test(ua) ||
        /chatgpt-user/i.test(ua) ||
        /oai-searchbot/i.test(ua) ||
        /claude-web/i.test(ua) ||
        /claudebot/i.test(ua) ||
        /anthropic-ai/i.test(ua) ||
        /perplexitybot/i.test(ua) ||
        /deepseek/i.test(ua) ||
        /semrush/i.test(ua) ||
        /ahrefs/i.test(ua) ||
        /screaming frog/i.test(ua) ||
        /lighthouse/i.test(ua) ||
        /pagespeed/i.test(ua) ||
        /chrome-lighthouse/i.test(ua) ||
        /Chrome\/99\.0\.4844\.51/i.test(ua)
      ) {
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  };

  const renderAd = (container, ad, isDarkMode, textColor, descColor) => {
    const anchor = document.createElement('a');
    const clickUrl = safeHttpUrl(ad.clickUrl);
    anchor.href = clickUrl || '#';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'flex';
    anchor.style.flexDirection = 'column';
    anchor.style.textDecoration = 'none';
    anchor.style.color = 'inherit';
    anchor.style.height = '100%';
    if (!clickUrl) {
      anchor.addEventListener('click', (event) => event.preventDefault());
    }

    const media = document.createElement('div');
    media.style.position = 'relative';
    media.style.width = '100%';
    media.style.maxHeight = '250px';
    media.style.backgroundColor = isDarkMode ? '#374151' : '#f3f4f6';
    media.style.display = 'flex';
    media.style.alignItems = 'center';
    media.style.justifyContent = 'center';

    const imageUrl = safeHttpUrl(ad.imageUrl);
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = safeText(ad.title);
      image.style.width = '100%';
      image.style.maxHeight = '250px';
      image.style.objectFit = 'contain';
      image.style.display = 'block';
      media.appendChild(image);
    } else {
      const noImage = document.createElement('div');
      noImage.textContent = 'No Image';
      noImage.style.width = '100%';
      noImage.style.height = '180px';
      noImage.style.display = 'flex';
      noImage.style.alignItems = 'center';
      noImage.style.justifyContent = 'center';
      noImage.style.color = descColor;
      media.appendChild(noImage);
    }

    const badge = document.createElement('div');
    badge.textContent = 'Ad';
    badge.style.position = 'absolute';
    badge.style.top = '12px';
    badge.style.right = '12px';
    badge.style.background = 'rgba(0,0,0,0.6)';
    badge.style.backdropFilter = 'blur(4px)';
    badge.style.color = 'white';
    badge.style.fontSize = '10px';
    badge.style.padding = '4px 8px';
    badge.style.borderRadius = '6px';
    badge.style.fontWeight = '700';
    badge.style.textTransform = 'uppercase';
    badge.style.letterSpacing = '0.5px';
    media.appendChild(badge);

    const copy = document.createElement('div');
    copy.style.padding = '16px';
    copy.style.flexGrow = '1';
    copy.style.display = 'flex';
    copy.style.flexDirection = 'column';

    const title = document.createElement('h4');
    title.textContent = safeText(ad.title);
    title.style.margin = '0 0 8px 0';
    title.style.fontSize = '16px';
    title.style.fontWeight = '700';
    title.style.color = textColor;
    title.style.lineHeight = '1.4';
    copy.appendChild(title);

    const description = document.createElement('p');
    description.textContent = safeText(ad.description);
    description.style.margin = '0';
    description.style.fontSize = '14px';
    description.style.color = descColor;
    description.style.lineHeight = '1.5';
    description.style.display = '-webkit-box';
    description.style.webkitLineClamp = '2';
    description.style.webkitBoxOrient = 'vertical';
    description.style.overflow = 'hidden';
    description.style.textOverflow = 'ellipsis';
    copy.appendChild(description);

    anchor.append(media, copy);
    container.replaceChildren(anchor);
    return anchor;
  };

  const isElementTrulyVisible = (container) => {
    if (!container || !container.isConnected) return false;
    if (document.visibilityState !== 'visible') return false;

    // 1. Physical dimensions: real banner ads must have visible human-readable dimensions
    const rect = container.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 20) return false;

    // 2. Viewport coordinates: must actually be located inside the visible viewport
    const winWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const winHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (winWidth <= 0 || winHeight <= 0) return false;
    if (rect.bottom <= 0 || rect.top >= winHeight || rect.right <= 0 || rect.left >= winWidth) {
      return false;
    }

    // 3. Computed style: cannot be hidden by zero opacity, visibility: hidden, or display: none
    try {
      const style = window.getComputedStyle(container);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const opacity = parseFloat(style.opacity);
      if (!isNaN(opacity) && opacity < 0.1) return false;
    } catch (_) {}

    return true;
  };

  const clearViewabilityTimer = (container) => {
    const state = viewabilityTimers.get(container);
    if (state) clearTimeout(state.timer);
    viewabilityTimers.delete(container);
  };

  const viewabilityObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      const container = entry.target;
      const isViewable =
        document.visibilityState === 'visible' &&
        entry.isIntersecting &&
        entry.intersectionRatio >= 0.5 &&
        isElementTrulyVisible(container);

      if (!isViewable) {
        clearViewabilityTimer(container);
        return;
      }

      const existingState = viewabilityTimers.get(container);
      if (existingState) {
        existingState.visiblePercent = Math.round(entry.intersectionRatio * 100);
        return;
      }

      const state = {
        startedAt: Date.now(),
        visiblePercent: Math.round(entry.intersectionRatio * 100),
        timer: null,
      };
      state.timer = window.setTimeout(() => {
        if (viewabilityTimers.get(container) !== state) return;

        viewabilityTimers.delete(container);
        observedAdContainers.delete(container);
        observer.unobserve(container);

        const visibleDurationMs = Date.now() - state.startedAt;
        if (
          document.visibilityState !== 'visible' ||
          !container.isConnected ||
          state.visiblePercent < 50 ||
          visibleDurationMs < 1000 ||
          !isElementTrulyVisible(container)
        ) return;

        const adId = container.getAttribute('data-served-ad-id');
        const token = container.getAttribute('data-served-ad-token');
        const appId = container.getAttribute('data-served-app-id');
        if (!adId || !token || !appId) return;

        const rect = container.getBoundingClientRect();
        fetch(`${baseUrl}/api/ads/impression`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          keepalive: true,
          body: JSON.stringify({
            adId,
            token,
            appId,
            platform: 'web',
            visiblePercent: state.visiblePercent,
            visibleDurationMs,
            containerWidth: Math.round(rect.width),
            containerHeight: Math.round(rect.height),
            pagePath: window.location.pathname,
          }),
        }).catch((e) => console.error('AdTogether impression error:', e));
      }, 1000);

      viewabilityTimers.set(container, state);
    });
  }, { threshold: [0, 0.5] });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
      for (const container of viewabilityTimers.keys()) clearViewabilityTimer(container);
      return;
    }

    for (const container of observedAdContainers) {
      viewabilityObserver.unobserve(container);
      viewabilityObserver.observe(container);
    }
  });

  const init = async () => {
    // Automated browser guard: never fetch ads for headless scrapers, Google WRS, or social indexers
    if (isAutomatedBrowser()) return;

    // Find all uninitialized ad containers
    const adContainers = document.querySelectorAll('[data-ad-unit]:not([data-ad-loaded])');
    if (adContainers.length === 0) return;

    // 3. Fetch and Render Ads
    for (const container of adContainers) {
      container.setAttribute('data-ad-loaded', 'true'); // mark as processing

      try {
        const adUnit = container.getAttribute('data-ad-unit') || 'unknown';
        const appId =
          container.getAttribute('data-app-id') ||
          scriptElement?.getAttribute('data-app-id');
        if (!appId) {
          console.warn('AdTogether: Set data-app-id on the script tag or ad container.');
          continue;
        }
        const serveUrl = new URL('/api/ads/serve', baseUrl);
        serveUrl.search = new URLSearchParams({
          adType: 'banner',
          adUnitId: adUnit,
          appId,
        }).toString();
        const response = await fetch(serveUrl.toString());
        if (!response.ok) {
          console.warn('AdTogether: No ads available.');
          continue;
        }

        const ad = await response.json();
        const adId = safeText(ad.id);
        if (ad.adType !== 'banner' || !adId) {
          console.warn('AdTogether: Discarded an ad with an unexpected type.');
          continue;
        }
        container.setAttribute('data-served-ad-id', adId);
        container.setAttribute('data-served-ad-token', safeText(ad.token));
        container.setAttribute('data-served-app-id', appId);

        // Styling the container
        container.style.display = 'block';
        container.style.border = '1px solid rgba(0, 0, 0, 0.1)';
        container.style.borderRadius = '12px';
        container.style.overflow = 'hidden';
        container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
        container.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        container.style.backgroundColor = '#ffffff';
        container.style.textDecoration = 'none';
        container.style.width = '100%';
        container.style.cursor = 'pointer';

        // Hover effects
        container.onmouseenter = () => {
          container.style.transform = 'translateY(-2px)';
          container.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
        };
        container.onmouseleave = () => {
          container.style.transform = 'translateY(0)';
          container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
        };

        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const textColor = isDarkMode ? '#f9fafb' : '#111827';
        const descColor = isDarkMode ? '#9ca3af' : '#6b7280';
        const bgAdColor = isDarkMode ? '#1f2937' : '#ffffff';

        container.style.backgroundColor = bgAdColor;
        container.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        const anchor = renderAd(container, ad, isDarkMode, textColor, descColor);

        // 4. Track Clicks (record at most once per ad load to prevent duplicate click events)
        anchor.addEventListener('click', () => {
          fetch(`${baseUrl}/api/ads/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            keepalive: true,
            body: JSON.stringify({ adId, token: safeText(ad.token), appId }),
          }).catch((e) => console.error('AdTogether click error:', e));
        }, { once: true });

        // Start observing for impressions
        observedAdContainers.add(container);
        viewabilityObserver.observe(container);
      } catch (error) {
        console.error('AdTogether SDK Error:', error);
      }
    }
  };

  // Run on DOM loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 5. Support Single Page Applications (React, Vue, Next.js)
  // Watch the DOM for new ad units added dynamically
  const mutationObserver = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      // Small debounce to prevent processing too heavily during big DOM updates
      clearTimeout(window._adTogetherTimeout);
      window._adTogetherTimeout = setTimeout(init, 100);
    }
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });
})();
