"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AdTogetherBanner = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _AdTogether = require("./AdTogether");
var _jsxRuntime = require("react/jsx-runtime");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const AdTogetherBanner = ({
  adUnitId,
  onAdLoaded,
  onAdFailedToLoad,
  showCloseButton = false,
  onAdClosed,
  theme = 'auto',
  style
}) => {
  const [adData, setAdData] = (0, _react.useState)(null);
  const [isLoading, setIsLoading] = (0, _react.useState)(true);
  const [hasError, setHasError] = (0, _react.useState)(false);
  const [isVisible, setIsVisible] = (0, _react.useState)(true);
  const systemColorScheme = (0, _reactNative.useColorScheme)();
  const impressionTrackedRef = (0, _react.useRef)(false);
  (0, _react.useEffect)(() => {
    let isMounted = true;
    _AdTogether.AdTogether.fetchAd(adUnitId, 'banner').then(ad => {
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
  (0, _react.useEffect)(() => {
    if (adData && !isLoading && !hasError && !impressionTrackedRef.current) {
      impressionTrackedRef.current = true;
      _AdTogether.AdTogether.trackImpression(adData.id, adData.token);
    }
  }, [adData, isLoading, hasError]);
  const handlePress = () => {
    if (!adData) return;
    _AdTogether.AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      _reactNative.Linking.openURL(adData.clickUrl).catch(console.error);
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
    return /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
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
  return /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.TouchableOpacity, {
    activeOpacity: 0.8,
    onPress: handlePress,
    style: [styles.container, {
      backgroundColor: bgColor,
      borderColor
    }, style],
    children: [adData.imageUrl ? /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
      style: styles.imageContainer,
      children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Image, {
        source: {
          uri: adData.imageUrl
        },
        style: styles.image,
        resizeMode: "cover"
      })
    }) : null, /*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
      style: styles.textContainer,
      children: [/*#__PURE__*/(0, _jsxRuntime.jsxs)(_reactNative.View, {
        style: styles.headerRow,
        children: [/*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
          style: [styles.title, {
            color: textColor
          }],
          numberOfLines: 1,
          children: adData.title
        }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.View, {
          style: styles.adBadge,
          children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
            style: styles.adBadgeText,
            children: "AD"
          })
        })]
      }), /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
        style: [styles.description, {
          color: descColor
        }],
        numberOfLines: 2,
        children: adData.description
      })]
    }), showCloseButton && /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Pressable, {
      onPress: handleClose,
      style: styles.closeButton,
      hitSlop: 8,
      accessibilityLabel: "Close ad",
      accessibilityRole: "button",
      children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_reactNative.Text, {
        style: styles.closeButtonText,
        children: "\xD7"
      })
    })]
  });
};
exports.AdTogetherBanner = AdTogetherBanner;
const styles = _reactNative.StyleSheet.create({
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
    zIndex: 1
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18
  }
});
//# sourceMappingURL=AdTogetherBanner.js.map