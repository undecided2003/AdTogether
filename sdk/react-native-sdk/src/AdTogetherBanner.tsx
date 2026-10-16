import React, { useEffect, useState, useRef } from 'react';
import { AppState, Dimensions, View, Text, Image, TouchableOpacity, StyleSheet, useColorScheme, Linking, Pressable } from 'react-native';
import { AdTogether } from './AdTogether';
import { AdModel } from './types';

export interface AdTogetherBannerProps {
  adUnitId?: string;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: Error) => void;
  /** Whether to show a close button on the banner */
  showCloseButton?: boolean;
  /** Callback when the user closes the ad */
  onAdClosed?: () => void;
  /** Pass 'dark' to use dark mode, 'light' for light mode, or 'auto' (default) to respect system preference */
  theme?: 'dark' | 'light' | 'auto';
  style?: any;
}

export const AdTogetherBanner: React.FC<AdTogetherBannerProps> = ({
  adUnitId = 'default',
  onAdLoaded,
  onAdFailedToLoad,
  showCloseButton = false,
  onAdClosed,
  theme = 'auto',
  style,
}) => {
  const [adData, setAdData] = useState<AdModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const systemColorScheme = useColorScheme();
  
  const impressionTrackedRef = useRef(false);
  const containerRef = useRef<View>(null);
  const appStateRef = useRef(AppState.currentState);
  const [appState, setAppState] = useState(appStateRef.current);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Keep the timer guard current before React renders the state update
      // and cleans up the interval.
      appStateRef.current = nextAppState;
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

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

  // Track an impression only after the banner stays at least half visible for one second.
  useEffect(() => {
    if (!adData || isLoading || hasError || !isVisible || appState !== 'active' || impressionTrackedRef.current) {
      return;
    }

    let cancelled = false;
    let visibleSince: number | null = null;
    const checkVisibility = () => {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        if (cancelled || appStateRef.current !== 'active' || impressionTrackedRef.current) return;
        const window = Dimensions.get('window');
        const totalArea = width * height;
        const visibleWidth = Math.max(0, Math.min(x + width, window.width) - Math.max(x, 0));
        const visibleHeight = Math.max(0, Math.min(y + height, window.height) - Math.max(y, 0));
        const visiblePercent = totalArea > 0
          ? Math.round((visibleWidth * visibleHeight / totalArea) * 100)
          : 0;

        if (visiblePercent < 50) {
          visibleSince = null;
          return;
        }
        const now = Date.now();
        visibleSince ??= now;
        const visibleDurationMs = now - visibleSince;
        if (visibleDurationMs >= 1000) {
          impressionTrackedRef.current = true;
          AdTogether.trackImpression(adData.id, adData.token, { visiblePercent, visibleDurationMs });
        }
      });
    };

    checkVisibility();
    const interval = setInterval(checkVisibility, 100);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [adData, appState, hasError, isLoading, isVisible]);

  const handlePress = () => {
    if (!adData) return;
    AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      Linking.openURL(adData.clickUrl).catch(console.error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onAdClosed?.();
  };

  if (!isVisible) {
    return null;
  }

  if (isLoading) {
    return <View style={[styles.container, style]} />;
  }

  if (hasError || !adData) {
    return null;
  }

  const isDarkMode = theme === 'auto' ? systemColorScheme === 'dark' : theme === 'dark';
  
  const bgColor = isDarkMode ? '#1F2937' : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const textColor = isDarkMode ? '#F9FAFB' : '#111827';
  const descColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  return (
    <View ref={containerRef} collapsable={false}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={[
          styles.container,
          { backgroundColor: bgColor, borderColor },
          style,
        ]}
      >
      {adData.imageUrl ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: adData.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      ) : null}
      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {adData.title}
          </Text>
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>AD</Text>
          </View>
        </View>
        <Text style={[styles.description, { color: descColor }]} numberOfLines={2}>
          {adData.description}
        </Text>
      </View>
      {showCloseButton && (
        <Pressable
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={8}
          accessibilityLabel="Close ad"
          accessibilityRole="button"
        >
          <Text style={styles.closeButtonText}>×</Text>
        </Pressable>
      )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  imageContainer: {
    width: 120,
    height: '100%',
    minHeight: 80,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    padding: 12,
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  adBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  adBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
});
