package com.adtogether.sdk

import android.content.Context
import android.util.Log
import com.adtogether.sdk.models.AdModel
import com.adtogether.sdk.network.AdNetworkService

object AdTogether {
    private const val TAG = "AdTogetherSDK"
    
    var appId: String? = null
        private set
        
    var baseUrl: String = "https://adtogether.relaxsoftwareapps.com"
        private set

    var lastAdId: String? = null
        private set
        
    var allowSelfAds: Boolean = true
        private set

    internal var appContext: Context? = null
        private set

    /**
     * Initializes the AdTogether SDK.
     * @param context The application context.
     * @param appId Your registered application ID.
     * @param baseUrl (Optional) Override the base URL for testing purposes.
     */
    fun initialize(context: Context, appId: String, baseUrl: String? = null, allowSelfAds: Boolean = true) {
        this.appId = appId
        this.appContext = context.applicationContext
        this.allowSelfAds = allowSelfAds
        if (baseUrl != null) {
            this.baseUrl = baseUrl
        }
        Log.i(TAG, "AdTogether SDK Initialized with App ID: $appId")
    }

    internal fun assertInitialized(): Boolean {
        if (appId == null) {
            Log.e(TAG, "AdTogether Error: SDK has not been initialized. Please call AdTogether.initialize() before displaying ads.")
            return false
        }
        return true
    }

    /**
     * Fetches an ad for a specific ad unit.
     * @param adType Optional filter: "banner" or "interstitial".
     */
    suspend fun fetchAd(adUnitId: String, adType: String? = null): AdModel? {
        if (!assertInitialized()) return null
        val ad = AdNetworkService.fetchAd(adUnitId, adType, lastAdId, allowSelfAds)
        if (ad != null) {
            lastAdId = ad.id
        }
        return ad
    }

    /**
     * Tracks an impression for a specific ad.
     */
    suspend fun trackImpression(adId: String, token: String?) {
        if (!assertInitialized()) return
        AdNetworkService.trackImpression(adId, token)
    }

    /**
     * Tracks a click for a specific ad.
     */
    suspend fun trackClick(adId: String, token: String?) {
        if (!assertInitialized()) return
        AdNetworkService.trackClick(adId, token)
    }
}
