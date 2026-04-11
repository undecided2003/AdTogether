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

    /**
     * Initializes the AdTogether SDK.
     * @param context The application context.
     * @param appId Your registered application ID.
     * @param baseUrl (Optional) Override the base URL for testing purposes.
     */
    fun initialize(context: Context, appId: String, baseUrl: String? = null) {
        this.appId = appId
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
     */
    suspend fun fetchAd(adUnitId: String): AdModel? {
        if (!assertInitialized()) return null
        return AdNetworkService.fetchAd(adUnitId)
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
