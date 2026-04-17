package com.adtogether.sdk.views

import android.content.Intent
import android.net.Uri
import android.content.res.Configuration
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.adtogether.sdk.AdTogether
import com.adtogether.sdk.models.AdModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Full-screen interstitial ad dialog.
 *
 * Usage:
 * ```kotlin
 * if (showInterstitial) {
 *     AdTogetherInterstitial(
 *         adUnitId = "my_interstitial",
 *         closeDelay = 3,
 *         onDismiss = { showInterstitial = false }
 *     )
 * }
 * ```
 */
@Composable
fun AdTogetherInterstitial(
    adUnitId: String,
    closeDelay: Int = 3,
    onAdLoaded: (() -> Unit)? = null,
    onAdFailedToLoad: ((String) -> Unit)? = null,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (!AdTogether.assertInitialized()) {
        onAdFailedToLoad?.invoke("SDK not initialized")
        onDismiss()
        return
    }

    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var adData by remember { mutableStateOf<AdModel?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var hasError by remember { mutableStateOf(false) }
    var impressionTracked by remember { mutableStateOf(false) }
    var canClose by remember { mutableStateOf(false) }
    var countdown by remember { mutableIntStateOf(closeDelay) }

    val configuration = LocalContext.current.resources.configuration
    val isLandscape = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

    // Fetch ad
    LaunchedEffect(adUnitId) {
        val result = AdTogether.fetchAd(adUnitId, "interstitial")
        if (result != null) {
            adData = result
            onAdLoaded?.invoke()
        } else {
            hasError = true
            onAdFailedToLoad?.invoke("No ad available or network error")
            onDismiss()
        }
        isLoading = false
    }

    // Countdown timer
    LaunchedEffect(adData) {
        if (adData != null) {
            repeat(closeDelay) {
                delay(1000L)
                countdown--
            }
            canClose = true
        }
    }

    // Track impression
    LaunchedEffect(adData) {
        if (adData != null && !impressionTracked) {
            impressionTracked = true
            AdTogether.trackImpression(adData!!.id, adData!!.token)
        }
    }

    Dialog(
        onDismissRequest = { if (canClose) onDismiss() },
        properties = DialogProperties(
            dismissOnBackPress = canClose,
            dismissOnClickOutside = canClose,
            usePlatformDefaultWidth = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.85f)),
            contentAlignment = Alignment.Center
        ) {
            if (isLoading) {
                CircularProgressIndicator(color = Color(0xFFFFC107))
            } else if (adData != null) {
                val ad = adData!!
                val containerColor = MaterialTheme.colorScheme.surface
                val textColor = MaterialTheme.colorScheme.onSurface
                val descColor = MaterialTheme.colorScheme.onSurfaceVariant

                Box(
                    modifier = Modifier
                        .widthIn(max = if (isLandscape) 720.dp else 480.dp)
                        .padding(horizontal = if (isLandscape) 40.dp else 20.dp)
                ) {
                    Surface(
                        modifier = Modifier
                            .shadow(40.dp, RoundedCornerShape(20.dp))
                            .clip(RoundedCornerShape(20.dp)),
                        color = containerColor,
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        if (isLandscape) {
                            Row(modifier = Modifier.heightIn(max = 320.dp)) {
                                // Image
                                if (!ad.imageUrl.isNullOrEmpty()) {
                                    AsyncImage(
                                        model = ad.imageUrl,
                                        contentDescription = ad.title,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .weight(1f)
                                            .fillMaxHeight()
                                            .clickable {
                                                coroutineScope.launch { AdTogether.trackClick(ad.id, ad.token) }
                                                ad.clickUrl?.let { url ->
                                                    try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
                                                }
                                            }
                                    )
                                }

                                // Content
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .fillMaxHeight()
                                        .verticalScroll(rememberScrollState())
                                        .padding(20.dp)
                                        .clickable {
                                            coroutineScope.launch { AdTogether.trackClick(ad.id, ad.token) }
                                            ad.clickUrl?.let { url ->
                                                try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
                                            }
                                        }
                                ) {
                                    Row(verticalAlignment = Alignment.Top) {
                                        Text(
                                            text = ad.title,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 18.sp,
                                            color = textColor,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Box(
                                            modifier = Modifier
                                                .background(Color(0xFFFFC107), RoundedCornerShape(4.dp))
                                                .padding(horizontal = 6.dp, vertical = 3.dp)
                                        ) {
                                            Text("AD", fontWeight = FontWeight.Bold, fontSize = 10.sp, color = Color.Black)
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    Text(
                                        text = ad.description,
                                        fontSize = 14.sp,
                                        color = descColor,
                                        maxLines = 3,
                                        overflow = TextOverflow.Ellipsis,
                                        lineHeight = 21.sp
                                    )

                                    Spacer(modifier = Modifier.height(16.dp))

                                    // CTA
                                    Button(
                                        onClick = {
                                            coroutineScope.launch { AdTogether.trackClick(ad.id, ad.token) }
                                            ad.clickUrl?.let { url ->
                                                try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
                                    ) {
                                        Text(
                                            "Learn More →",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = Color.Black,
                                            modifier = Modifier.padding(vertical = 6.dp)
                                        )
                                    }
                                }
                            }
                        } else {
                            Column {
                                // Image
                                if (!ad.imageUrl.isNullOrEmpty()) {
                                    AsyncImage(
                                        model = ad.imageUrl,
                                        contentDescription = ad.title,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .aspectRatio(16f / 9f)
                                            .clickable {
                                                coroutineScope.launch { AdTogether.trackClick(ad.id, ad.token) }
                                                ad.clickUrl?.let { url ->
                                                    try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
                                                }
                                            }
                                    )
                                }

                                // Content
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(20.dp)
                                        .clickable {
                                            coroutineScope.launch { AdTogether.trackClick(ad.id, ad.token) }
                                            ad.clickUrl?.let { url ->
                                                try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
                                            }
                                        }
                                ) {
                                    Row(verticalAlignment = Alignment.Top) {
                                        Text(
                                            text = ad.title,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 18.sp,
                                            color = textColor,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Box(
                                            modifier = Modifier
                                                .background(Color(0xFFFFC107), RoundedCornerShape(4.dp))
                                                .padding(horizontal = 6.dp, vertical = 3.dp)
                                        ) {
                                            Text("AD", fontWeight = FontWeight.Bold, fontSize = 10.sp, color = Color.Black)
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    Text(
                                        text = ad.description,
                                        fontSize = 14.sp,
                                        color = descColor,
                                        maxLines = 3,
                                        overflow = TextOverflow.Ellipsis,
                                        lineHeight = 21.sp
                                    )

                                    Spacer(modifier = Modifier.height(16.dp))

                                    // CTA
                                    Button(
                                        onClick = {
                                            coroutineScope.launch { AdTogether.trackClick(ad.id, ad.token) }
                                            ad.clickUrl?.let { url ->
                                                try { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
                                            }
                                        },
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
                                    ) {
                                        Text(
                                            "Learn More →",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = Color.Black,
                                            modifier = Modifier.padding(vertical = 6.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Close / Countdown button
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(12.dp)
                            .size(36.dp)
                            .background(Color.Black.copy(alpha = 0.6f), CircleShape)
                            .then(
                                if (canClose) Modifier.clickable { onDismiss() }
                                else Modifier
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        if (canClose) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Close",
                                tint = Color.White,
                                modifier = Modifier.size(20.dp)
                            )
                        } else {
                            Text(
                                text = "$countdown",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }
    }
}
