import React from 'react';

interface AdTogetherBannerProps {
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
declare const AdTogetherBanner: React.FC<AdTogetherBannerProps>;

interface AdTogetherInterstitialProps {
    adUnitId?: string;
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
declare const AdTogetherInterstitial: React.FC<AdTogetherInterstitialProps>;

export { AdTogetherBanner, type AdTogetherBannerProps, AdTogetherInterstitial, type AdTogetherInterstitialProps };
