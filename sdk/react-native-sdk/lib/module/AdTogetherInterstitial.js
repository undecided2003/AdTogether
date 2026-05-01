"use strict";

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, SafeAreaView, useColorScheme, Linking, useWindowDimensions, ScrollView } from 'react-native';
import { AdTogether } from './AdTogether';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const AdTogetherInterstitial = ({
  adUnitId = 'default',
  isOpen,
  onClose,
  closeDelay = 3,
  onAdLoaded,
  onAdFailedToLoad,
  theme = 'auto'
}) => {
  const [adData, setAdData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(closeDelay);
  const systemColorScheme = useColorScheme();
  const {
    width,
    height
  } = useWindowDimensions();
  const isLandscape = width > height;
  const impressionTrackedRef = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoading(true);
    setHasError(false);
    setTimeLeft(closeDelay);
    impressionTrackedRef.current = false;
    AdTogether.fetchAd(adUnitId, 'interstitial').then(ad => {
      if (isMounted) {
        setAdData(ad);
        setIsLoading(false);
        onAdLoaded?.();
      }
    }).catch(err => {
      if (isMounted) {
        console.error('AdTogether Interstitial Failed:', err);
        setHasError(true);
        setIsLoading(false);
        onAdFailedToLoad?.(err);
        onClose(); // Automatically close on error
      }
    });
    return () => {
      isMounted = false;
    };
  }, [adUnitId, isOpen, closeDelay, onAdLoaded, onAdFailedToLoad, onClose]);

  // Track impression and start timer
  useEffect(() => {
    if (isOpen && adData && !isLoading && !hasError && !impressionTrackedRef.current) {
      impressionTrackedRef.current = true;
      AdTogether.trackImpression(adData.id, adData.token);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, adData, isLoading, hasError]);
  const handlePress = () => {
    if (!adData) return;
    AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      Linking.openURL(adData.clickUrl).catch(console.error);
    }
  };
  if (!isOpen || isLoading || hasError || !adData) {
    return null;
  }
  const isDarkMode = theme === 'auto' ? systemColorScheme === 'dark' : theme === 'dark';
  const bgColor = isDarkMode ? '#111827' : '#ffffff';
  const textColor = isDarkMode ? '#F9FAFB' : '#111827';
  const descColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const buttonBgColor = isDarkMode ? '#374151' : '#F3F4F6';
  return /*#__PURE__*/_jsx(Modal, {
    visible: isOpen,
    animationType: "slide",
    transparent: false,
    children: /*#__PURE__*/_jsxs(SafeAreaView, {
      style: [styles.container, {
        backgroundColor: bgColor
      }],
      children: [/*#__PURE__*/_jsx(View, {
        style: styles.header,
        children: timeLeft > 0 ? /*#__PURE__*/_jsx(View, {
          style: [styles.closeButton, {
            backgroundColor: buttonBgColor
          }],
          children: /*#__PURE__*/_jsx(Text, {
            style: {
              color: descColor,
              fontWeight: 'bold'
            },
            children: timeLeft
          })
        }) : /*#__PURE__*/_jsx(TouchableOpacity, {
          onPress: onClose,
          style: [styles.closeButton, {
            backgroundColor: buttonBgColor
          }],
          children: /*#__PURE__*/_jsx(Text, {
            style: {
              color: textColor,
              fontWeight: 'bold',
              fontSize: 16
            },
            children: "\u2715"
          })
        })
      }), /*#__PURE__*/_jsx(View, {
        style: [styles.content, isLandscape && styles.contentLandscape],
        children: /*#__PURE__*/_jsxs(TouchableOpacity, {
          activeOpacity: 0.9,
          style: [styles.card, isLandscape && styles.cardLandscape],
          onPress: handlePress,
          children: [/*#__PURE__*/_jsx(View, {
            style: [styles.imageWrapper, isLandscape && styles.imageWrapperLandscape, !isLandscape && {
              backgroundColor: isDarkMode ? '#111827' : '#F3F4F6'
            }],
            children: adData.imageUrl ? /*#__PURE__*/_jsx(Image, {
              source: {
                uri: adData.imageUrl
              },
              style: [styles.image, !isLandscape && {
                resizeMode: 'contain'
              }],
              resizeMode: isLandscape ? "cover" : "contain"
            }) : /*#__PURE__*/_jsx(View, {
              style: [styles.imagePlaceholder, {
                backgroundColor: isDarkMode ? '#1F2937' : '#E5E7EB'
              }]
            })
          }), /*#__PURE__*/_jsxs(ScrollView, {
            style: isLandscape ? styles.scrollContentLandscape : styles.scrollContent,
            contentContainerStyle: [styles.textWrapper, isLandscape && styles.textWrapperLandscape],
            showsVerticalScrollIndicator: false,
            children: [/*#__PURE__*/_jsx(View, {
              style: styles.adBadge,
              children: /*#__PURE__*/_jsx(Text, {
                style: styles.adBadgeText,
                children: "Advertisement"
              })
            }), /*#__PURE__*/_jsx(Text, {
              style: [styles.title, {
                color: textColor
              }],
              children: adData.title
            }), /*#__PURE__*/_jsx(Text, {
              style: [styles.description, {
                color: descColor
              }],
              children: adData.description
            }), /*#__PURE__*/_jsx(View, {
              style: styles.ctaButton,
              children: /*#__PURE__*/_jsx(Text, {
                style: styles.ctaText,
                children: "Learn More"
              })
            }), /*#__PURE__*/_jsx(Text, {
              style: [styles.poweredBy, {
                color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
              }],
              children: "Powered by AdTogether"
            })]
          })]
        })
      })]
    })
  });
};
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    zIndex: 10
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
    alignItems: 'center',
    justifyContent: 'center'
  },
  contentLandscape: {
    padding: 16
  },
  card: {
    width: '100%',
    alignItems: 'center'
  },
  cardLandscape: {
    flexDirection: 'row',
    flex: 1,
    maxWidth: 800,
    width: '100%'
  },
  imageWrapper: {
    width: '100%',
    maxHeight: 300,
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5
  },
  imageWrapperLandscape: {
    flex: 1,
    aspectRatio: undefined,
    height: '100%',
    marginBottom: 0,
    marginRight: 24
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 16
  },
  scrollContent: {
    width: '100%',
    flexGrow: 0
  },
  scrollContentLandscape: {
    flex: 1,
    height: '100%'
  },
  textWrapper: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 20
  },
  textWrapperLandscape: {
    justifyContent: 'center',
    minHeight: '100%'
  },
  adBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16
  },
  adBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32
  },
  ctaButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center'
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  poweredBy: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.3
  }
});
//# sourceMappingURL=AdTogetherInterstitial.js.map