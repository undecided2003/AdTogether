package com.adtogether.sdk.network

import android.util.Base64
import android.os.SystemClock
import android.util.Log
import android.net.Uri
import com.adtogether.sdk.AdTogether
import com.adtogether.sdk.models.AdModel
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.StandardIntegrityException
import com.google.android.play.core.integrity.StandardIntegrityManager
import com.google.android.play.core.integrity.StandardIntegrityManager.PrepareIntegrityTokenRequest
import com.google.android.play.core.integrity.StandardIntegrityManager.StandardIntegrityTokenRequest
import com.google.android.play.core.integrity.model.StandardIntegrityErrorCode
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import kotlin.coroutines.resume

private data class NativeAttestationConfig(
    val provider: String,
    val cloudProjectNumber: Long,
    val expiresAtElapsedRealtimeMs: Long
)

internal object AdNetworkService {
    private const val TAG = "AdTogetherSDK"
    private const val GRANT_CONFIG_TTL_MS = 15 * 60 * 1_000L
    private const val MAX_GRANT_CONFIGS = 256

    private val attestationByGrant = ConcurrentHashMap<String, NativeAttestationConfig>()
    private val grantConfigLock = Any()

    // A StandardIntegrityTokenProvider is intended to be prepared ahead of time and reused.
    // Keep concurrent fetches from spending the Play Integrity preparation quota repeatedly.
    private val integrityProviders = ConcurrentHashMap<Long, StandardIntegrityManager.StandardIntegrityTokenProvider>()
    private val integrityProviderPreparations = ConcurrentHashMap<Long, CompletableDeferred<StandardIntegrityManager.StandardIntegrityTokenProvider?>>()
    private val integrityWarmupScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    suspend fun fetchAd(adUnitId: String = "default", adType: String? = null, exclude: String? = null, allowSelfAds: Boolean = true): AdModel? = withContext(Dispatchers.IO) {
        try {
            val url = buildServeUrl(adUnitId, adType, exclude, allowSelfAds)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 5000
            connection.readTimeout = 5000

            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val responseString = connection.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(responseString)

                val responseAdType = json.optString("adType").takeIf { it.isNotEmpty() }
                if (adType != null && responseAdType != adType) {
                    Log.w(TAG, "Discarding a $responseAdType ad response for requested $adType")
                    return@withContext null
                }

                val token = json.optString("token").takeIf { it.isNotEmpty() }
                val provider = json.optString("nativeAttestation").takeIf { it.isNotEmpty() }
                if (token != null && provider == "play-integrity") {
                    val projectNumber = json.optString("playIntegrityProjectNumber", "").toLongOrNull()
                    if (projectNumber != null && projectNumber > 0) {
                        rememberNativeAttestation(token, provider, projectNumber)
                        warmPlayIntegrityProvider(projectNumber)
                    } else {
                        Log.e(TAG, "A Play Integrity impression grant was missing a valid cloud project number")
                    }
                }

                return@withContext AdModel(
                    id = json.getString("id"),
                    title = json.getString("title"),
                    description = json.getString("description"),
                    clickUrl = json.optString("clickUrl").takeIf { it.isNotEmpty() },
                    imageUrl = json.optString("imageUrl").takeIf { it.isNotEmpty() },
                    token = token,
                    adType = responseAdType
                )
            } else if (responseCode == HttpURLConnection.HTTP_UNAUTHORIZED || responseCode == HttpURLConnection.HTTP_FORBIDDEN) {
                Log.e(TAG, "AdTogether Error: Invalid App ID. Please check your dashboard.")
                return@withContext null
            } else {
                Log.e(TAG, "Failed to fetch ad. Code: $responseCode")
                return@withContext null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Network error fetching ad", e)
            return@withContext null
        }
    }

    private fun buildServeUrl(
        adUnitId: String,
        adType: String?,
        exclude: String?,
        allowSelfAds: Boolean
    ): URL {
        val builder = Uri.parse(AdTogether.baseUrl).buildUpon()
            .clearQuery()
            .fragment(null)
            .appendPath("api")
            .appendPath("ads")
            .appendPath("serve")
            .appendQueryParameter("adUnitId", adUnitId)
            .appendQueryParameter("appId", AdTogether.appId.orEmpty())
            .appendQueryParameter("allowSelfAds", allowSelfAds.toString())
            .appendQueryParameter("platform", "android")

        adType?.let { builder.appendQueryParameter("adType", it) }
        exclude?.let { builder.appendQueryParameter("exclude", it) }
        AdTogether.bundleId?.let { builder.appendQueryParameter("bundleId", it) }

        return URL(builder.build().toString())
    }

    suspend fun trackImpression(
        adId: String,
        token: String?,
        visiblePercent: Int? = null,
        visibleDurationMs: Long? = null
    ) {
        trackEvent("/api/ads/impression", adId, token, visiblePercent, visibleDurationMs)
    }

    suspend fun trackClick(adId: String, token: String?) {
        trackEvent("/api/ads/click", adId, token)
    }

    private suspend fun trackEvent(
        endpoint: String,
        adId: String,
        token: String?,
        visiblePercent: Int? = null,
        visibleDurationMs: Long? = null
    ) = withContext(Dispatchers.IO) {
        try {
            val url = URL("${AdTogether.baseUrl}$endpoint")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.connectTimeout = 5000
            
            val nativeConfig = if (endpoint == "/api/ads/impression" && token != null) {
                getNativeAttestation(token)
            } else null
            val playIntegrityToken = if (
                nativeConfig?.provider == "play-integrity" &&
                token != null
            ) {
                requestPlayIntegrityToken(token, nativeConfig.cloudProjectNumber)
            } else null

            val jsonParams = JSONObject().apply {
                put("adId", adId)
                if (token != null) put("token", token)
                if (playIntegrityToken != null) put("playIntegrityToken", playIntegrityToken)
                put("appId", AdTogether.appId)
                // Send the app package name for origin tracking
                AdTogether.bundleId?.let { put("bundleId", it) }
                // Send platform and app metadata to match Flutter SDK
                put("platform", "android")
                AdTogether.appName?.let { put("appName", it) }
                AdTogether.appVersion?.let { put("appVersion", it) }
                visiblePercent?.let { put("visiblePercent", it) }
                visibleDurationMs?.let { put("visibleDurationMs", it) }
                val isDebug = try {
                    val appInfo = AdTogether.appContext?.applicationInfo
                    appInfo != null && (appInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
                } catch (_: Exception) { false }
                put("environment", if (isDebug) "development" else "production")
            }
            
            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(jsonParams.toString())
                writer.flush()
            }
            
            val code = connection.responseCode
            if (code == HttpURLConnection.HTTP_OK) {
                if (token != null) {
                    takeNativeAttestation(token)
                }
            } else {
                Log.e(TAG, "Failed to track $endpoint. Code: $code")
            }
            Unit
        } catch (e: Exception) {
            Log.e(TAG, "Network error tracking $endpoint", e)
            Unit
        }
    }

    private fun rememberNativeAttestation(
        grantToken: String,
        provider: String,
        cloudProjectNumber: Long
    ) {
        val now = SystemClock.elapsedRealtime()
        synchronized(grantConfigLock) {
            removeExpiredGrantConfigs(now)

            if (!attestationByGrant.containsKey(grantToken) && attestationByGrant.size >= MAX_GRANT_CONFIGS) {
                val entriesToRemove = attestationByGrant.entries
                    .sortedBy { it.value.expiresAtElapsedRealtimeMs }
                    .take(attestationByGrant.size - MAX_GRANT_CONFIGS + 1)
                entriesToRemove.forEach { entry ->
                    attestationByGrant.remove(entry.key, entry.value)
                }
            }

            attestationByGrant[grantToken] = NativeAttestationConfig(
                provider = provider,
                cloudProjectNumber = cloudProjectNumber,
                expiresAtElapsedRealtimeMs = now + GRANT_CONFIG_TTL_MS
            )
        }
    }

    private fun getNativeAttestation(grantToken: String): NativeAttestationConfig? {
        val config = attestationByGrant[grantToken] ?: return null
        return config.takeIf { it.expiresAtElapsedRealtimeMs > SystemClock.elapsedRealtime() }
    }

    private fun takeNativeAttestation(grantToken: String): NativeAttestationConfig? {
        val config = attestationByGrant.remove(grantToken) ?: return null
        return config.takeIf { it.expiresAtElapsedRealtimeMs > SystemClock.elapsedRealtime() }
    }

    private fun removeExpiredGrantConfigs(now: Long) {
        attestationByGrant.entries.forEach { entry ->
            if (entry.value.expiresAtElapsedRealtimeMs <= now) {
                attestationByGrant.remove(entry.key, entry.value)
            }
        }
    }

    private fun warmPlayIntegrityProvider(cloudProjectNumber: Long) {
        integrityWarmupScope.launch {
            try {
                getOrPreparePlayIntegrityProvider(cloudProjectNumber)
            } catch (error: Exception) {
                Log.w(TAG, "Could not warm the Play Integrity token provider", error)
            }
        }
    }

    private suspend fun requestPlayIntegrityToken(grantToken: String, cloudProjectNumber: Long): String? {
        val requestHash = Base64.encodeToString(
            MessageDigest.getInstance("SHA-256").digest(grantToken.toByteArray(Charsets.UTF_8)),
            Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
        )

        val provider = try {
            getOrPreparePlayIntegrityProvider(cloudProjectNumber) ?: return null
        } catch (error: Exception) {
            Log.e(TAG, "Could not prepare the Play Integrity token provider", error)
            return null
        }

        return try {
            requestPlayIntegrityToken(provider, requestHash)
        } catch (error: StandardIntegrityException) {
            if (error.errorCode != StandardIntegrityErrorCode.INTEGRITY_TOKEN_PROVIDER_INVALID) {
                Log.e(TAG, "Could not obtain Play Integrity token", error)
                return null
            }

            // Google documents this as the signal to obtain a replacement provider. Retry the
            // same grant exactly once; a grant remains bound to the request hash either way.
            integrityProviders.remove(cloudProjectNumber, provider)
            val replacement = try {
                getOrPreparePlayIntegrityProvider(cloudProjectNumber) ?: return null
            } catch (retryError: Exception) {
                Log.e(TAG, "Could not refresh the Play Integrity token provider", retryError)
                return null
            }
            return try {
                requestPlayIntegrityToken(replacement, requestHash)
            } catch (retryError: Exception) {
                if (
                    retryError is StandardIntegrityException &&
                    retryError.errorCode == StandardIntegrityErrorCode.INTEGRITY_TOKEN_PROVIDER_INVALID
                ) {
                    integrityProviders.remove(cloudProjectNumber, replacement)
                }
                Log.e(TAG, "Could not refresh the Play Integrity token provider", retryError)
                null
            }
        } catch (error: Exception) {
            Log.e(TAG, "Could not obtain Play Integrity token", error)
            null
        }
    }

    private suspend fun getOrPreparePlayIntegrityProvider(
        cloudProjectNumber: Long
    ): StandardIntegrityManager.StandardIntegrityTokenProvider? {
        integrityProviders[cloudProjectNumber]?.let { return it }

        val preparation = CompletableDeferred<StandardIntegrityManager.StandardIntegrityTokenProvider?>()
        val inFlightPreparation = integrityProviderPreparations.putIfAbsent(cloudProjectNumber, preparation)
        if (inFlightPreparation != null) {
            return inFlightPreparation.await()
        }

        try {
            val provider = preparePlayIntegrityProvider(cloudProjectNumber)
            if (provider != null) {
                integrityProviders[cloudProjectNumber] = provider
            }
            preparation.complete(provider)
            return provider
        } catch (error: Exception) {
            preparation.completeExceptionally(error)
            throw error
        } finally {
            integrityProviderPreparations.remove(cloudProjectNumber, preparation)
        }
    }

    private suspend fun preparePlayIntegrityProvider(
        cloudProjectNumber: Long
    ): StandardIntegrityManager.StandardIntegrityTokenProvider? {
        val context = AdTogether.appContext ?: return null
        return suspendCancellableCoroutine { continuation ->
            IntegrityManagerFactory.createStandard(context)
                .prepareIntegrityToken(
                    PrepareIntegrityTokenRequest.builder()
                        .setCloudProjectNumber(cloudProjectNumber)
                        .build()
                )
                .addOnSuccessListener { provider ->
                    if (continuation.isActive) continuation.resume(provider)
                }
                .addOnFailureListener { error ->
                    if (continuation.isActive) continuation.resumeWith(Result.failure(error))
                }
        }
    }

    private suspend fun requestPlayIntegrityToken(
        provider: StandardIntegrityManager.StandardIntegrityTokenProvider,
        requestHash: String
    ): String = suspendCancellableCoroutine { continuation ->
        provider.request(
            StandardIntegrityTokenRequest.builder()
                .setRequestHash(requestHash)
                .build()
        )
            .addOnSuccessListener { result ->
                if (continuation.isActive) continuation.resume(result.token())
            }
            .addOnFailureListener { error ->
                if (continuation.isActive) continuation.resumeWith(Result.failure(error))
            }
    }
}
