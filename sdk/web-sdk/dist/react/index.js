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
  AdTogetherBanner: () => AdTogetherBanner
});
module.exports = __toCommonJS(react_exports);

// src/react/AdTogetherBanner.tsx
var import_react = require("react");

// src/core/AdTogether.ts
var AdTogether = class _AdTogether {
  constructor() {
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
    if (options.baseUrl) {
      sdk.baseUrl = options.baseUrl;
    }
    console.log(`AdTogether SDK Initialized with Key/ID: ${sdk.appId}`);
  }
  assertInitialized() {
    if (!this.appId) {
      console.error("AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.");
      return false;
    }
    return true;
  }
  static async fetchAd(adUnitId) {
    if (!_AdTogether.shared.assertInitialized()) {
      throw new Error("AdTogether not initialized");
    }
    const response = await fetch(`${_AdTogether.shared.baseUrl}/api/ads/serve?country=global&adUnitId=${adUnitId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ad. Status: ${response.status}`);
    }
    return response.json();
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
      body: JSON.stringify({ adId, token })
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AdTogetherBanner
});
