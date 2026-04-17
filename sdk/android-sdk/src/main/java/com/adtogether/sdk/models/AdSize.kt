package com.adtogether.sdk.models

/**
 * AdSize defines the dimensions for an ad placement.
 */
data class AdSize(val width: Float, val height: Float) {
    companion object {
        val BANNER = AdSize(320f, 50f)
        val LARGE_BANNER = AdSize(320f, 100f)
        val MEDIUM_RECTANGLE = AdSize(300f, 250f)
        val FULL_BANNER = AdSize(468f, 60f)
        val LEADERBOARD = AdSize(728f, 90f)

        // Special value to indicate it should expand naturally
        val FLUID = AdSize(-1f, -1f)
    }

    val isFluid: Boolean get() = width == -1f && height == -1f
}
