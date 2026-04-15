"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/react/index.ts
var react_exports = {};
__export(react_exports, {
  AdTogetherBanner: () => AdTogetherBanner,
  AdTogetherInterstitial: () => AdTogetherInterstitial
});
module.exports = __toCommonJS(react_exports);

// src/react/AdTogetherBanner.tsx
var import_react = require("react");

// src/core/AdTogether.ts
var AdTogether = class _AdTogether {
  constructor() {
    this.allowSelfAds = true;
    this.baseUrl = "https://adtogether.relaxsoftwareapps.com";
  }
  static get shared() {
    if (!_AdTogether.instance) {
      _AdTogether.instance = new _AdTogether();
    }
    return _AdTogether.instance;
  }
  static initialize(options) {
    const sdk = _AdTogether.shared;
    sdk.appId = options.apiKey || options.appId;
    if (options.allowSelfAds !== void 0) {
      sdk.allowSelfAds = options.allowSelfAds;
    }
    if (options.baseUrl) {
      sdk.baseUrl = options.baseUrl;
    } else if (typeof window !== "undefined") {
      sdk.baseUrl = "";
    }
    console.log(`AdTogether SDK Initialized with App ID: ${sdk.appId}`);
  }
  assertInitialized() {
    if (!this.appId) {
      console.error("AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.");
      return false;
    }
    return true;
  }
  static async fetchAd(adUnitId, adType) {
    if (!_AdTogether.shared.assertInitialized()) {
      throw new Error("AdTogether not initialized");
    }
    try {
      const sdk = _AdTogether.shared;
      let url = `${sdk.baseUrl}/api/ads/serve?country=global&adUnitId=${adUnitId}&apiKey=${sdk.appId}`;
      if (adType) {
        url += `&adType=${adType}`;
      }
      if (sdk.lastAdId) {
        url += `&exclude=${sdk.lastAdId}`;
      }
      url += `&allowSelfAds=${sdk.allowSelfAds}`;
      if (typeof window !== "undefined") {
        url += `&sourceUrl=${encodeURIComponent(window.location.href)}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const ad = await response.json();
        sdk.lastAdId = ad.id;
        return ad;
      }
      throw new Error(`Failed to fetch ad. Status: ${response.status}`);
    } catch (err) {
      throw err;
    }
  }
  static trackImpression(adId, token) {
    this.trackEvent("/api/ads/impression", adId, token);
  }
  static trackClick(adId, token) {
    this.trackEvent("/api/ads/click", adId, token);
  }
  static trackEvent(endpoint, adId, token) {
    if (!_AdTogether.shared.assertInitialized()) return;
    fetch(`${_AdTogether.shared.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        adId,
        token,
        apiKey: _AdTogether.shared.appId
      })
    }).catch(console.error);
  }
};

// src/react/AdTogetherBanner.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var AdTogetherBanner = ({
  adUnitId,
  className = "",
  style = {},
  onAdLoaded,
  onAdFailedToLoad,
  width = "100%",
  height = "auto",
  theme = "auto"
}) => {
  const [adData, setAdData] = (0, import_react.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react.useState)(true);
  const [hasError, setHasError] = (0, import_react.useState)(false);
  const [isDarkMode, setIsDarkMode] = (0, import_react.useState)(theme === "dark");
  const containerRef = (0, import_react.useRef)(null);
  const impressionTrackedRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setIsDarkMode(mediaQuery.matches);
      const handler = (e) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      setIsDarkMode(theme === "dark");
    }
  }, [theme]);
  (0, import_react.useEffect)(() => {
    let isMounted = true;
    AdTogether.fetchAd(adUnitId).then((ad) => {
      if (isMounted) {
        setAdData(ad);
        setIsLoading(false);
        onAdLoaded?.();
      }
    }).catch((err) => {
      if (isMounted) {
        console.error("AdTogether Failed to load ad:", err);
        setHasError(true);
        setIsLoading(false);
        onAdFailedToLoad?.(err);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [adUnitId, onAdLoaded, onAdFailedToLoad]);
  (0, import_react.useEffect)(() => {
    if (!adData || isLoading || hasError || !containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && entries[0].intersectionRatio >= 0.5 && !impressionTrackedRef.current) {
          impressionTrackedRef.current = true;
          AdTogether.trackImpression(adData.id, adData.token);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, [adData, isLoading, hasError]);
  const handleContainerClick = () => {
    if (!adData) return;
    AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      window.open(adData.clickUrl, "_blank", "noopener,noreferrer");
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        style: { width, height, ...style },
        className
      }
    );
  }
  if (hasError || !adData) {
    return null;
  }
  const bgColor = isDarkMode ? "#1F2937" : "#ffffff";
  const borderColor = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const textColor = isDarkMode ? "#F9FAFB" : "#111827";
  const descColor = isDarkMode ? "#9CA3AF" : "#6B7280";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      ref: containerRef,
      className: `adtogether-banner ${className}`,
      onClick: handleContainerClick,
      style: {
        display: "flex",
        flexDirection: "row",
        width,
        height,
        backgroundColor: bgColor,
        borderRadius: "12px",
        border: `1px solid ${borderColor}`,
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        cursor: "pointer",
        boxSizing: "border-box",
        ...style
      },
      onMouseOver: (e) => {
        e.currentTarget.style.transform = "scale(1.02)";
        e.currentTarget.style.transition = "transform 0.2s";
      },
      onMouseOut: (e) => {
        e.currentTarget.style.transform = "scale(1)";
      },
      children: [
        adData.imageUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flexShrink: 0, width: "120px", height: "100%", minHeight: "80px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "img",
          {
            src: adData.imageUrl,
            alt: adData.title,
            style: { width: "100%", height: "100%", objectFit: "cover" }
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "12px", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: "bold", fontSize: "14px", color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: adData.title }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: {
              backgroundColor: "#FBBF24",
              color: "#000",
              fontSize: "9px",
              fontWeight: "bold",
              padding: "2px 4px",
              borderRadius: "4px",
              marginLeft: "8px"
            }, children: "AD" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "12px", color: descColor, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }, children: adData.description })
        ] })
      ]
    }
  );
};

// src/react/AdTogetherInterstitial.tsx
var import_react2 = require("react");
var import_react_dom = require("react-dom");
var import_jsx_runtime2 = require("react/jsx-runtime");
var AdTogetherInterstitial = ({
  adUnitId,
  isOpen,
  onClose,
  onAdLoaded,
  onAdFailedToLoad,
  theme = "auto",
  closeDelay = 3
}) => {
  const [adData, setAdData] = (0, import_react2.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react2.useState)(false);
  const [hasError, setHasError] = (0, import_react2.useState)(false);
  const [isDarkMode, setIsDarkMode] = (0, import_react2.useState)(theme === "dark");
  const [canClose, setCanClose] = (0, import_react2.useState)(false);
  const [countdown, setCountdown] = (0, import_react2.useState)(closeDelay);
  const impressionTrackedRef = (0, import_react2.useRef)(false);
  const closeTimerRef = (0, import_react2.useRef)(null);
  const countdownRef = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    if (theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setIsDarkMode(mediaQuery.matches);
      const handler = (e) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      setIsDarkMode(theme === "dark");
    }
  }, [theme]);
  (0, import_react2.useEffect)(() => {
    if (!isOpen) {
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
    AdTogether.fetchAd(adUnitId, "interstitial").then((ad) => {
      if (isMounted) {
        setAdData(ad);
        setIsLoading(false);
        onAdLoaded?.();
      }
    }).catch((err) => {
      if (isMounted) {
        console.error("AdTogether Failed to load interstitial:", err);
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
  (0, import_react2.useEffect)(() => {
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
    }, 1e3);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isOpen, adData, closeDelay]);
  (0, import_react2.useEffect)(() => {
    if (!adData || !isOpen || impressionTrackedRef.current) return;
    impressionTrackedRef.current = true;
    AdTogether.trackImpression(adData.id, adData.token);
  }, [adData, isOpen]);
  const handleAdClick = (0, import_react2.useCallback)(() => {
    if (!adData) return;
    AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      window.open(adData.clickUrl, "_blank", "noopener,noreferrer");
    }
  }, [adData]);
  const handleClose = (0, import_react2.useCallback)(() => {
    if (canClose) {
      onClose();
    }
  }, [canClose, onClose]);
  (0, import_react2.useEffect)(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);
  if (!isOpen) return null;
  const bgOverlay = "rgba(0, 0, 0, 0.7)";
  const cardBg = isDarkMode ? "#1F2937" : "#ffffff";
  const borderColor = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const textColor = isDarkMode ? "#F9FAFB" : "#111827";
  const descColor = isDarkMode ? "#9CA3AF" : "#6B7280";
  const content = /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      className: "adtogether-interstitial-overlay",
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: bgOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1e5,
        backdropFilter: "blur(8px)",
        animation: "adtogether-fade-in 0.3s ease-out"
      },
      onClick: (e) => {
        if (e.target === e.currentTarget && canClose) handleClose();
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("style", { children: `
        @keyframes adtogether-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes adtogether-scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      ` }),
        isLoading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { color: "#fff", fontSize: "18px" }, children: "Loading Ad..." }) : adData ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "div",
          {
            style: {
              position: "relative",
              maxWidth: "800px",
              width: "95%",
              backgroundColor: cardBg,
              borderRadius: "24px",
              border: `1px solid ${borderColor}`,
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
              animation: "adtogether-scale-in 0.3s ease-out"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { position: "absolute", top: "12px", right: "12px", zIndex: 10 }, children: canClose ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  onClick: handleClose,
                  style: {
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    border: "none",
                    color: "#fff",
                    fontSize: "18px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)"
                  },
                  "aria-label": "Close ad",
                  children: "\u2715"
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "div",
                {
                  style: {
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backdropFilter: "blur(4px)"
                  },
                  children: countdown
                }
              ) }),
              adData.imageUrl && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "div",
                {
                  style: { cursor: "pointer", position: "relative" },
                  onClick: handleAdClick,
                  children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                    "img",
                    {
                      src: adData.imageUrl,
                      alt: adData.title,
                      style: {
                        width: "100%",
                        aspectRatio: "16/9",
                        objectFit: "cover",
                        display: "block"
                      }
                    }
                  )
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
                "div",
                {
                  style: { padding: "20px", cursor: "pointer" },
                  onClick: handleAdClick,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }, children: [
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { fontWeight: "bold", fontSize: "18px", color: textColor }, children: adData.title }),
                      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                        "span",
                        {
                          style: {
                            backgroundColor: "#FBBF24",
                            color: "#000",
                            fontSize: "10px",
                            fontWeight: "bold",
                            padding: "3px 6px",
                            borderRadius: "4px",
                            marginLeft: "8px",
                            flexShrink: 0
                          },
                          children: "AD"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { style: { fontSize: "14px", color: descColor, margin: 0, lineHeight: 1.5 }, children: adData.description }),
                    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                      "button",
                      {
                        style: {
                          marginTop: "16px",
                          width: "100%",
                          padding: "12px",
                          backgroundColor: "#F59E0B",
                          color: "#000",
                          fontWeight: "bold",
                          fontSize: "14px",
                          border: "none",
                          borderRadius: "12px",
                          cursor: "pointer"
                        },
                        onClick: (e) => {
                          e.stopPropagation();
                          handleAdClick();
                        },
                        children: "Learn More \u2192"
                      }
                    )
                  ]
                }
              )
            ]
          }
        ) : null
      ]
    }
  );
  return (0, import_react_dom.createPortal)(content, document.body);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AdTogetherBanner,
  AdTogetherInterstitial
});
