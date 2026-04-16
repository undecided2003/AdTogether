import React from 'react';
export interface AdTogetherBannerProps {
    adUnitId: string;
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (error: Error) => void;
    /** Pass 'dark' to use dark mode, 'light' for light mode, or 'auto' (default) to respect system preference */
    theme?: 'dark' | 'light' | 'auto';
    style?: any;
}
export declare const AdTogetherBanner: React.FC<AdTogetherBannerProps>;
//# sourceMappingURL=AdTogetherBanner.d.ts.map