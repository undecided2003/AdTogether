import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AdTogether } from '../core/AdTogether';
import { AdModel } from '../core/types';

export interface AdTogetherInterstitialProps {
  adUnitId: string;
  /** When true, the interstitial is shown (fetches and displays full-screen ad) */
  isOpen: boolean;
  /** Called when the user closes the interstitial */
  onClose: () => void;
  /** Called when the ad is successfully loaded */
  onAdLoaded?: () => void;
  /** Called when the ad fails to load */
  onAdFailedToLoad?: (error: Error) => void;
  /** Pass 'dark' to use dark mode, 'light' for light mode, or 'auto' (default) to respect system preference */
  theme?: 'dark' | 'light' | 'auto';
  /** Delay in seconds before the close button appears. Defaults to 3 */
  closeDelay?: number;
}

export const AdTogetherInterstitial: React.FC<AdTogetherInterstitialProps> = ({
  adUnitId,
  isOpen,
  onClose,
  onAdLoaded,
  onAdFailedToLoad,
  theme = 'auto',
  closeDelay = 3,
}) => {
  const [adData, setAdData] = useState<AdModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');
  const [canClose, setCanClose] = useState(false);
  const [countdown, setCountdown] = useState(closeDelay);

  const impressionTrackedRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Fetch ad when opened
  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setAdData(null);
      setIsLoading(false);
      setHasError(false);
      setCanClose(false);
      setCountdown(closeDelay);
      impressionTrackedRef.current = false;

      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    AdTogether.fetchAd(adUnitId, 'interstitial')
      .then((ad) => {
        if (isMounted) {
          setAdData(ad);
          setIsLoading(false);
          onAdLoaded?.();
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('AdTogether Failed to load interstitial:', err);
          setHasError(true);
          setIsLoading(false);
          onAdFailedToLoad?.(err);
          onClose();
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, adUnitId]);

  // Close delay countdown
  useEffect(() => {
    if (!isOpen || !adData) return;

    setCountdown(closeDelay);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isOpen, adData, closeDelay]);

  // Impression tracking
  useEffect(() => {
    if (!adData || !isOpen || impressionTrackedRef.current) return;
    impressionTrackedRef.current = true;
    AdTogether.trackImpression(adData.id, adData.token);
  }, [adData, isOpen]);

  const handleAdClick = useCallback(() => {
    if (!adData) return;
    AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      window.open(adData.clickUrl, '_blank', 'noopener,noreferrer');
    }
  }, [adData]);

  const handleClose = useCallback(() => {
    if (canClose) {
      onClose();
    }
  }, [canClose, onClose]);

  // Block body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const bgOverlay = 'rgba(0, 0, 0, 0.7)';
  const cardBg = isDarkMode ? '#1F2937' : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const textColor = isDarkMode ? '#F9FAFB' : '#111827';
  const descColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  const content = (
    <div
      className="adtogether-interstitial-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: bgOverlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        backdropFilter: 'blur(8px)',
        animation: 'adtogether-fade-in 0.3s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && canClose) handleClose();
      }}
    >
      <style>{`
        @keyframes adtogether-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes adtogether-scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .adtogether-interstitial-card {
          display: flex;
          flex-direction: column;
        }
        .adtogether-interstitial-img-wrapper {
          width: 100%;
        }
        
        @media (orientation: landscape) and (max-height: 600px) {
          .adtogether-interstitial-card {
            flex-direction: row;
            max-height: 90vh;
          }
          .adtogether-interstitial-img-wrapper {
            width: 50%;
            flex-shrink: 0;
            display: flex;
          }
          .adtogether-interstitial-img-wrapper img {
            height: 100% !important;
            aspect-ratio: auto !important;
          }
          .adtogether-interstitial-content {
            width: 50%;
            overflow-y: auto;
          }
        }
      `}</style>

      {isLoading ? (
        <div style={{ color: '#fff', fontSize: '18px' }}>Loading Ad...</div>
      ) : adData ? (
        <div
          className="adtogether-interstitial-card"
          style={{
            position: 'relative',
            maxWidth: '800px',
            width: '95%',
            backgroundColor: cardBg,
            borderRadius: '24px',
            border: `1px solid ${borderColor}`,
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
            animation: 'adtogether-scale-in 0.3s ease-out',
          }}
        >
          {/* Close / Countdown Button */}
          <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
            {canClose ? (
              <button
                onClick={handleClose}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}
                aria-label="Close ad"
              >
                ✕
              </button>
            ) : (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {countdown}
              </div>
            )}
          </div>

          {/* Ad Image */}
          {adData.imageUrl && (
            <div
              className="adtogether-interstitial-img-wrapper"
              style={{ cursor: 'pointer', position: 'relative', backgroundColor: isDarkMode ? '#111827' : '#F3F4F6' }}
              onClick={handleAdClick}
            >
              <img
                src={adData.imageUrl}
                alt={adData.title}
                style={{
                  width: '100%',
                  maxHeight: '350px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          )}

          {/* Ad Content */}
          <div
            className="adtogether-interstitial-content"
            style={{ padding: '20px', cursor: 'pointer' }}
            onClick={handleAdClick}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '18px', color: textColor }}>
                {adData.title}
              </span>
              <span
                style={{
                  backgroundColor: '#FBBF24',
                  color: '#000',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  marginLeft: '8px',
                  flexShrink: 0,
                }}
              >
                AD
              </span>
            </div>
            <p style={{ fontSize: '14px', color: descColor, margin: 0, lineHeight: 1.5 }}>
              {adData.description}
            </p>

            {/* CTA Button */}
            <button
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '12px',
                backgroundColor: '#F59E0B',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '14px',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleAdClick();
              }}
            >
              Learn More →
            </button>
            <p
              style={{
                marginTop: '12px',
                marginBottom: 0,
                fontSize: '10px',
                color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                textAlign: 'center',
                letterSpacing: '0.3px',
              }}
            >
              Powered by AdTogether
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(content, document.body);
};
