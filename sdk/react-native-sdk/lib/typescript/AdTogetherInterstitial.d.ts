import React from 'react';
export interface AdTogetherInterstitialProps {
    adUnitId: string;
    isOpen: boolean;
    onClose: () => void;
    closeDelay?: number;
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (error: Error) => void;
    theme?: 'dark' | 'light' | 'auto';
}
export declare const AdTogetherInterstitial: React.FC<AdTogetherInterstitialProps>;
//# sourceMappingURL=AdTogetherInterstitial.d.ts.map