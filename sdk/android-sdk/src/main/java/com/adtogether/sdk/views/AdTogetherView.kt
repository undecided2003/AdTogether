package com.adtogether.sdk.views

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import coil.compose.AsyncImage
import com.adtogether.sdk.AdTogether
import com.adtogether.sdk.models.AdModel
import kotlinx.coroutines.launch

@Composable
fun AdTogetherView(
    adUnitId: String,
    onAdLoaded: (() -> Unit)? = null,
    onAdFailedToLoad: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    if (!AdTogether.assertInitialized()) {
        onAdFailedToLoad?.invoke("SDK not initialized")
        return
    }

    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var adData by remember { mutableStateOf<AdModel?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var hasError by remember { mutableStateOf(false) }
    var impressionTracked by remember { mutableStateOf(false) }

    LaunchedEffect(adUnitId) {
        val result = AdTogether.fetchAd(adUnitId)
        if (result != null) {
            adData = result
            onAdLoaded?.invoke()
        } else {
            hasError = true
            onAdFailedToLoad?.invoke("No ad available or network error")
        }
        isLoading = false
    }

    if (isLoading) {
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    if (hasError || adData == null) {
        return // Hide silently on error
    }

    val ad = adData!!

    // Track Impression when ad hits the composition
    LaunchedEffect(ad.id) {
        if (!impressionTracked) {
            impressionTracked = true
            AdTogether.trackImpression(ad.id, ad.token)
        }
    }

    val containerColor = MaterialTheme.colorScheme.surface
    val textColor = MaterialTheme.colorScheme.onSurface
    val descColor = MaterialTheme.colorScheme.onSurfaceVariant

    Surface(
        modifier = modifier
            .shadow(4.dp, RoundedCornerShape(12.dp))
            .clip(RoundedCornerShape(12.dp))
            .clickable {
                // Track click and open URL
                coroutineScope.launch {
                    AdTogether.trackClick(ad.id, ad.token)
                }
                ad.clickUrl?.let { url ->
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        context.startActivity(intent)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            },
        color = containerColor,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, textColor.copy(alpha = 0.1f), RoundedCornerShape(12.dp)),
            verticalAlignment = Alignment.CenterVertically
        ) {
            
            // Image
            if (!ad.imageUrl.isNullOrEmpty()) {
                AsyncImage(
                    model = ad.imageUrl,
                    contentDescription = ad.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(topStart = 12.dp, bottomStart = 12.dp))
                )
            }

            // Text content
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(12.dp)
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    Text(
                        text = ad.title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = textColor,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .background(Color(0xFFFFC107), RoundedCornerShape(4.dp))
                            .padding(horizontal = 4.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "AD",
                            fontWeight = FontWeight.Bold,
                            fontSize = 8.sp,
                            color = Color.Black
                        )
                    }
                }

                Text(
                    text = ad.description,
                    fontSize = 12.sp,
                    color = descColor,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}
