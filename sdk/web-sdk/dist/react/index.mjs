import {
  AdTogether
} from "../chunk-RW43ES42.mjs";

// src/react/AdTogetherBanner.tsx
import { useEffect, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
var AdTogetherBanner = ({
  adUnitId,
  className = "",
  style = {},
  onAdLoaded,
  onAdFailedToLoad,
  showCloseButton = false,
  onAdClosed,
  width = "100%",
  height = "auto",
  theme = "auto"
}) => {
  const [adData, setAdData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(theme === "dark");
  const containerRef = useRef(null);
  const impressionTrackedRef = useRef(false);
  useEffect(() => {
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
  useEffect(() => {
    let isMounted = true;
    AdTogether.fetchAd(adUnitId, "banner").then((ad) => {
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
  useEffect(() => {
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
  const handleClose = (e) => {
    e.stopPropagation();
    setIsVisible(false);
    onAdClosed?.();
  };
  if (!isVisible) {
    return null;
  }
  if (isLoading) {
    return /* @__PURE__ */ jsx(
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
  return /* @__PURE__ */ jsxs(
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
        position: "relative",
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
        adData.imageUrl && /* @__PURE__ */ jsx("div", { style: { flexShrink: 0, width: "120px", height: "100%", minHeight: "80px" }, children: /* @__PURE__ */ jsx(
          "img",
          {
            src: adData.imageUrl,
            alt: adData.title,
            style: { width: "100%", height: "100%", objectFit: "cover" }
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { style: { padding: "12px", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontWeight: "bold", fontSize: "14px", color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: adData.title }),
            /* @__PURE__ */ jsx("span", { style: {
              backgroundColor: "#FBBF24",
              color: "#000",
              fontSize: "9px",
              fontWeight: "bold",
              padding: "2px 4px",
              borderRadius: "4px",
              marginLeft: "8px"
            }, children: "AD" })
          ] }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: "12px", color: descColor, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }, children: adData.description })
        ] }),
        showCloseButton && /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleClose,
            "aria-label": "Close ad",
            style: {
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              border: "none",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              lineHeight: 1,
              zIndex: 1
            },
            children: "\xD7"
          }
        )
      ]
    }
  );
};

// src/react/AdTogetherInterstitial.tsx
import { useEffect as useEffect2, useRef as useRef2, useState as useState2, useCallback } from "react";
import { createPortal } from "react-dom";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var AdTogetherInterstitial = ({
  adUnitId,
  isOpen,
  onClose,
  onAdLoaded,
  onAdFailedToLoad,
  theme = "auto",
  closeDelay = 3
}) => {
  const [adData, setAdData] = useState2(null);
  const [isLoading, setIsLoading] = useState2(false);
  const [hasError, setHasError] = useState2(false);
  const [isDarkMode, setIsDarkMode] = useState2(theme === "dark");
  const [canClose, setCanClose] = useState2(false);
  const [countdown, setCountdown] = useState2(closeDelay);
  const impressionTrackedRef = useRef2(false);
  const closeTimerRef = useRef2(null);
  const countdownRef = useRef2(null);
  useEffect2(() => {
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
  useEffect2(() => {
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
  useEffect2(() => {
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
  useEffect2(() => {
    if (!adData || !isOpen || impressionTrackedRef.current) return;
    impressionTrackedRef.current = true;
    AdTogether.trackImpression(adData.id, adData.token);
  }, [adData, isOpen]);
  const handleAdClick = useCallback(() => {
    if (!adData) return;
    AdTogether.trackClick(adData.id, adData.token);
    if (adData.clickUrl) {
      window.open(adData.clickUrl, "_blank", "noopener,noreferrer");
    }
  }, [adData]);
  const handleClose = useCallback(() => {
    if (canClose) {
      onClose();
    }
  }, [canClose, onClose]);
  useEffect2(() => {
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
  const content = /* @__PURE__ */ jsxs2(
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
        /* @__PURE__ */ jsx2("style", { children: `
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
      ` }),
        isLoading ? /* @__PURE__ */ jsx2("div", { style: { color: "#fff", fontSize: "18px" }, children: "Loading Ad..." }) : adData ? /* @__PURE__ */ jsxs2(
          "div",
          {
            className: "adtogether-interstitial-card",
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
              /* @__PURE__ */ jsx2("div", { style: { position: "absolute", top: "12px", right: "12px", zIndex: 10 }, children: canClose ? /* @__PURE__ */ jsx2(
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
              ) : /* @__PURE__ */ jsx2(
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
              adData.imageUrl && /* @__PURE__ */ jsx2(
                "div",
                {
                  className: "adtogether-interstitial-img-wrapper",
                  style: { cursor: "pointer", position: "relative" },
                  onClick: handleAdClick,
                  children: /* @__PURE__ */ jsx2(
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
              /* @__PURE__ */ jsxs2(
                "div",
                {
                  className: "adtogether-interstitial-content",
                  style: { padding: "20px", cursor: "pointer" },
                  onClick: handleAdClick,
                  children: [
                    /* @__PURE__ */ jsxs2("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }, children: [
                      /* @__PURE__ */ jsx2("span", { style: { fontWeight: "bold", fontSize: "18px", color: textColor }, children: adData.title }),
                      /* @__PURE__ */ jsx2(
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
                    /* @__PURE__ */ jsx2("p", { style: { fontSize: "14px", color: descColor, margin: 0, lineHeight: 1.5 }, children: adData.description }),
                    /* @__PURE__ */ jsx2(
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
  return createPortal(content, document.body);
};
export {
  AdTogetherBanner,
  AdTogetherInterstitial
};
