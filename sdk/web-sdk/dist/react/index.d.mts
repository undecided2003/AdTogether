import React from 'react';

interface AdTogetherBannerProps {
    adUnitId: string;
    className?: string;
    style?: React.CSSProperties;
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (error: Error) => void;
    /** Width of the ad element. Defaults to '100%' */
    width?: number | string;
    /** Height of the ad element. Defaults to 'auto' */
    height?: number | string;
    /** Pass 'dark' to use dark mode, 'light' for light mode, or 'auto' (default) to respect system preference */
    theme?: 'dark' | 'light' | 'auto';
}
declare const AdTogetherBanner: React.FC<AdTogetherBannerProps>;

export { AdTogetherBanner, type AdTogetherBannerProps };
