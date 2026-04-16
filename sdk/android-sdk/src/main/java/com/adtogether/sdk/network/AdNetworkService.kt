package com.adtogether.sdk.network

import android.util.Log
import com.adtogether.sdk.AdTogether
import com.adtogether.sdk.models.AdModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

internal object AdNetworkService {
    private const val TAG = "AdTogetherSDK"

    suspend fun fetchAd(adUnitId: String, adType: String? = null, exclude: String? = null, allowSelfAds: Boolean = true): AdModel? = withContext(Dispatchers.IO) {
        try {
            var urlStr = "${AdTogether.baseUrl}/api/ads/serve?country=global&adUnitId=$adUnitId&apiKey=${AdTogether.appId}&allowSelfAds=$allowSelfAds"
            if (adType != null) {
                urlStr += "&adType=$adType"
            }
            if (exclude != null) {
                urlStr += "&exclude=$exclude"
            }
            AdTogether.appContext?.packageName?.let {
                urlStr += "&bundleId=$it"
            }
            val url = URL(urlStr)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 5000
            connection.readTimeout = 5000

            if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                val responseString = connection.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(responseString)
                
                return@withContext AdModel(
                    id = json.getString("id"),
                    title = json.getString("title"),
                    description = json.getString("description"),
                    clickUrl = json.optString("clickUrl", null).takeIf { it.isNotEmpty() },
                    imageUrl = json.optString("imageUrl", null).takeIf { it.isNotEmpty() },
                    token = json.optString("token", null).takeIf { it.isNotEmpty() },
                    adType = json.optString("adType", null).takeIf { it.isNotEmpty() }
                )
            } else {
                Log.e(TAG, "Failed to fetch ad. Code: ${connection.responseCode}")
                return@withContext null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Network error fetching ad", e)
            return@withContext null
        }
    }

    suspend fun trackImpression(adId: String, token: String?) {
        trackEvent("/api/ads/impression", adId, token)
    }

    suspend fun trackClick(adId: String, token: String?) {
        trackEvent("/api/ads/click", adId, token)
    }

    private suspend fun trackEvent(endpoint: String, adId: String, token: String?) = withContext(Dispatchers.IO) {
        try {
            val url = URL("${AdTogether.baseUrl}$endpoint")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 5000
            
            val jsonParams = JSONObject().apply { 
                put("adId", adId)
                if (token != null) put("token", token)
                put("apiKey", AdTogether.appId)
                // Send the app package name for origin tracking
                AdTogether.appContext?.packageName?.let { put("bundleId", it) }
            }
            
            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(jsonParams.toString())
                writer.flush()
            }
            
            val code = connection.responseCode
            if (code != HttpURLConnection.HTTP_OK) {
                Log.e(TAG, "Failed to track $endpoint. Code: $code")
            }
            Unit
        } catch (e: Exception) {
            Log.e(TAG, "Network error tracking $endpoint", e)
            Unit
        }
    }
}
