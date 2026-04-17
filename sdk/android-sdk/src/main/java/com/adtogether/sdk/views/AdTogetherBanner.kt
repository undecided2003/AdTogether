package com.adtogether.sdk.views

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

import com.adtogether.sdk.models.AdSize

/**
 * AdTogetherBanner is a UI component that displays a banner ad.
 * This is an alias for AdTogetherView to maintain naming consistency across SDKs.
 */
@Composable
fun AdTogetherBanner(
    adUnitId: String,
    size: AdSize = AdSize.FLUID,
    showCloseButton: Boolean = false,
    onAdLoaded: (() -> Unit)? = null,
    onAdFailedToLoad: ((String) -> Unit)? = null,
    onAdClosed: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    AdTogetherView(
        adUnitId = adUnitId,
        size = size,
        showCloseButton = showCloseButton,
        onAdLoaded = onAdLoaded,
        onAdFailedToLoad = onAdFailedToLoad,
        onAdClosed = onAdClosed,
        modifier = modifier
    )
}
