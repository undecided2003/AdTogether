import React, { useEffect, useRef, useState } from 'react';
import { AdTogether } from '../core/AdTogether';
import { AdModel } from '../core/types';

export interface AdTogetherBannerProps {
  adUnitId?: string;
  className?: string;
  style?: React.CSSProperties;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: Error) => void;
  /** Whether to show a close button on the banner */
  showCloseButton?: boolean;
  /** Callback when the user closes the ad */
  onAdClosed?: () => void;
  /** Width of the ad element. Defaults to '100%' */
  width?: number | string;
  /** Height of the ad element. Defaults to 'auto' */
  height?: number | string;
  /** Pass 'dark' to use dark mode, 'light' for light mode, or 'auto' (default) to respect system preference */
  theme?: 'dark' | 'light' | 'auto';
}

export const AdTogetherBanner: React.FC<AdTogetherBannerProps> = ({
  adUnitId = 'default',
  className = '',
  style = {},
  onAdLoaded,
  onAdFailedToLoad,
  showCloseButton = false,
  onAdClosed,
  width = '100%',
  height = 'auto',
  theme = 'auto',
}) => {
  const [adData, setAdData] = useState<AdModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');

  const containerRef = useRef<HTMLDivElement>(null);
  const impressionTrackedRef = useRef(false);

  // Handle system theme changes
  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      setIsDarkMode(theme === 'dark');
    }
  }, [theme]);

  // Fetch Ad
  useEffect(() => {
    let isMounted = true;

    AdTogether.fetchAd(adUnitId, 'banner')
      .then((ad) => {
        if (isMounted) {
          setAdData(ad);
          setIsLoading(false);
          onAdLoaded?.();
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('AdTogether Failed to load ad:', err);
          setHasError(true);
          setIsLoading(false);
          onAdFailedToLoad?.(err);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [adUnitId, onAdLoaded, onAdFailedToLoad]);

  // Impression tracking
  useEffect(() => {
    if (!adData || isLoading || hasError || !isVisible || !containerRef.current) return;

    let visibleTimer: ReturnType<typeof setTimeout> | null = null;
    let visibleSince: number | null = null;
    let latestVisibleRatio = 0;

    const clearVisibleTimer = () => {
      if (visibleTimer) clearTimeout(visibleTimer);
      visibleTimer = null;
      visibleSince = null;
    };

    const startVisibleTimer = () => {
      if (visibleTimer || impressionTrackedRef.current || document.visibilityState !== 'visible') return;

      visibleSince = Date.now();
      visibleTimer = setTimeout(() => {
        const visibleDurationMs = visibleSince === null ? 0 : Date.now() - visibleSince;
        const visiblePercent = Math.round(latestVisibleRatio * 100);
        visibleTimer = null;
        visibleSince = null;

        if (
          impressionTrackedRef.current ||
          !isVisible ||
          !container.isConnected ||
          document.visibilityState !== 'visible' ||
          visiblePercent < 50 ||
          visibleDurationMs < 1000
        ) return;

        impressionTrackedRef.current = true;
        AdTogether.trackImpression(adData.id, adData.token, { visiblePercent, visibleDurationMs });
        observer.disconnect();
      }, 1000);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        latestVisibleRatio = entry.intersectionRatio;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === 'visible') {
          startVisibleTimer();
        } else {
          clearVisibleTimer();
        }
      },
      { threshold: [0, 0.5] }
    );

    const container = containerRef.current;
    const handleVisibilityChange = () => {
      clearVisibleTimer();
      if (document.visibilityState === 'visible') {
        latestVisibleRatio = 0;
        observer.unobserve(container);
        observer.observe(container);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    observer.observe(container);

    return () => {
      clearVisibleTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
    };
  }, [adData, isLoading, hasError, isVisible]);

  const handleContainerClick = () => {
    if (!adData) return;
    AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      window.open(adData.clickUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the ad click
    setIsVisible(false);
    onAdClosed?.();
  };

  if (!isVisible) {
    return null;
  }

  if (isLoading) {
    return (
      <div 
        style={{ width, height, ...style }} 
        className={className} 
      />
    );
  }

  if (hasError || !adData) {
    return null;
  }

  const bgColor = isDarkMode ? '#1F2937' : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const textColor = isDarkMode ? '#F9FAFB' : '#111827';
  const descColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  return (
    <div
      ref={containerRef}
      className={`adtogether-banner ${className}`}
      onClick={handleContainerClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        width,
        height,
        backgroundColor: bgColor,
        borderRadius: '12px',
        border: `1px solid ${borderColor}`,
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        cursor: 'pointer',
        boxSizing: 'border-box',
        position: 'relative',
        ...style,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.transition = 'transform 0.2s';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {adData.imageUrl && (
        <div style={{ flexShrink: 0, width: '120px', height: '100%', minHeight: '80px' }}>
          <img
            src={adData.imageUrl}
            alt={adData.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {adData.title}
          </span>
          <span style={{ 
            backgroundColor: '#FBBF24', 
            color: '#000', 
            fontSize: '9px', 
            fontWeight: 'bold', 
            padding: '2px 4px', 
            borderRadius: '4px',
            marginLeft: '8px'
          }}>
            AD
          </span>
        </div>
        <span style={{ fontSize: '12px', color: descColor, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {adData.description}
        </span>
      </div>
      {showCloseButton && (
        <button
          onClick={handleClose}
          aria-label="Close ad"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            border: 'none',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};
