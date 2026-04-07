(function () {
  // 1. Detect base URL dynamically based on where the script is hosted
  // This allows it to work on localhost:3000 during dev, and adtogether.com in prod.
  const scriptElement = document.currentScript || document.querySelector('script[src*="sdk.js"]');
  const baseUrl = scriptElement ? new URL(scriptElement.src).origin : 'https://adtogether.com';

  const init = async () => {
    // Find all uninitialized ad containers
    const adContainers = document.querySelectorAll('[data-ad-unit]:not([data-ad-loaded])');
    if (adContainers.length === 0) return;

    // 2. Set up IntersectionObserver to track impressions ONLY when ad is visible
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const container = entry.target;
            const adId = container.getAttribute('data-served-ad-id');
            if (adId) {
              // Send Impression Tracking Request
              fetch(`${baseUrl}/api/ads/impression`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adId }),
              }).catch((e) => console.error('AdTogether impression error:', e));
            }
            obs.unobserve(container); // Only count impression once per ad load
          }
        });
      },
      { threshold: 0.5 } // 50% of the ad must be visible
    );

    // 3. Fetch and Render Ads
    for (const container of adContainers) {
      container.setAttribute('data-ad-loaded', 'true'); // mark as processing

      try {
        const response = await fetch(`${baseUrl}/api/ads/serve?country=global`);
        if (!response.ok) {
          console.warn('AdTogether: No ads available.');
          continue;
        }

        const ad = await response.json();
        container.setAttribute('data-served-ad-id', ad.id);

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

        const clickUrl = ad.clickUrl || '#';
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const textColor = isDarkMode ? '#f9fafb' : '#111827';
        const descColor = isDarkMode ? '#9ca3af' : '#6b7280';
        const bgAdColor = isDarkMode ? '#1f2937' : '#ffffff';

        container.style.backgroundColor = bgAdColor;
        container.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        // Render HTML
        container.innerHTML = `
          <a href="${clickUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; flex-direction: column; text-decoration: none; color: inherit; height: 100%;">
            <div style="position: relative; width: 100%; height: 180px; background-color: ${isDarkMode ? '#374151' : '#f3f4f6'};">
              ${
                ad.imageUrl
                  ? `<img src="${ad.imageUrl}" alt="${ad.title}" style="width: 100%; height: 100%; object-fit: cover;" />`
                  : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: ${descColor};">No Image</div>`
              }
              <div style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); color: white; font-size: 10px; padding: 4px 8px; border-radius: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Ad</div>
            </div>
            <div style="padding: 16px; flex-grow: 1; display: flex; flex-direction: column;">
              <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: ${textColor}; line-height: 1.4;">${ad.title}</h4>
              <p style="margin: 0; font-size: 14px; color: ${descColor}; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${ad.description}</p>
            </div>
          </a>
        `;

        // 4. Track Clicks
        const anchor = container.querySelector('a');
        if (anchor) {
          anchor.addEventListener('click', () => {
            fetch(`${baseUrl}/api/ads/click`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ adId: ad.id }),
            }).catch((e) => console.error('AdTogether click error:', e));
          });
        }

        // Start observing for impressions
        observer.observe(container);
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
