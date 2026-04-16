"use strict";

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useColorScheme, Linking } from 'react-native';
import { AdTogether } from './AdTogether';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const AdTogetherBanner = ({
  adUnitId,
  onAdLoaded,
  onAdFailedToLoad,
  theme = 'auto',
  style
}) => {
  const [adData, setAdData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const systemColorScheme = useColorScheme();
  const impressionTrackedRef = useRef(false);
  useEffect(() => {
    let isMounted = true;
    AdTogether.fetchAd(adUnitId, 'banner').then(ad => {
      if (isMounted) {
        setAdData(ad);
        setIsLoading(false);
        onAdLoaded?.();
      }
    }).catch(err => {
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

  // Track impression when ad is rendered
  useEffect(() => {
    if (adData && !isLoading && !hasError && !impressionTrackedRef.current) {
      impressionTrackedRef.current = true;
      AdTogether.trackImpression(adData.id, adData.token);
    }
  }, [adData, isLoading, hasError]);
  const handlePress = () => {
    if (!adData) return;
    AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      Linking.openURL(adData.clickUrl).catch(console.error);
    }
  };
  if (isLoading) {
    return /*#__PURE__*/_jsx(View, {
      style: [styles.container, style]
    });
  }
  if (hasError || !adData) {
    return null;
  }
  const isDarkMode = theme === 'auto' ? systemColorScheme === 'dark' : theme === 'dark';
  const bgColor = isDarkMode ? '#1F2937' : '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const textColor = isDarkMode ? '#F9FAFB' : '#111827';
  const descColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  return /*#__PURE__*/_jsxs(TouchableOpacity, {
    activeOpacity: 0.8,
    onPress: handlePress,
    style: [styles.container, {
      backgroundColor: bgColor,
      borderColor
    }, style],
    children: [adData.imageUrl ? /*#__PURE__*/_jsx(View, {
      style: styles.imageContainer,
      children: /*#__PURE__*/_jsx(Image, {
        source: {
          uri: adData.imageUrl
        },
        style: styles.image,
        resizeMode: "cover"
      })
    }) : null, /*#__PURE__*/_jsxs(View, {
      style: styles.textContainer,
      children: [/*#__PURE__*/_jsxs(View, {
        style: styles.headerRow,
        children: [/*#__PURE__*/_jsx(Text, {
          style: [styles.title, {
            color: textColor
          }],
          numberOfLines: 1,
          children: adData.title
        }), /*#__PURE__*/_jsx(View, {
          style: styles.adBadge,
          children: /*#__PURE__*/_jsx(Text, {
            style: styles.adBadgeText,
            children: "AD"
          })
        })]
      }), /*#__PURE__*/_jsx(Text, {
        style: [styles.description, {
          color: descColor
        }],
        numberOfLines: 2,
        children: adData.description
      })]
    })]
  });
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
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  imageContainer: {
    width: 120,
    height: '100%',
    minHeight: 80
  },
  image: {
    width: '100%',
    height: '100%'
  },
  textContainer: {
    padding: 12,
    flex: 1,
    justifyContent: 'center'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1
  },
  adBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8
  },
  adBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold'
  },
  description: {
    fontSize: 12
  }
});
//# sourceMappingURL=AdTogetherBanner.js.map