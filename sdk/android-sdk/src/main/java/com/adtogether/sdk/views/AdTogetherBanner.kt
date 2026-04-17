package com.adtogether.sdk.views

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * AdTogetherBanner is a UI component that displays a banner ad.
 * This is an alias for AdTogetherView to maintain naming consistency across SDKs.
 */
@Composable
fun AdTogetherBanner(
    adUnitId: String,
    onAdLoaded: (() -> Unit)? = null,
    onAdFailedToLoad: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    AdTogetherView(
        adUnitId = adUnitId,
        onAdLoaded = onAdLoaded,
        onAdFailedToLoad = onAdFailedToLoad,
        modifier = modifier
    )
}
