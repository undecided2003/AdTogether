# AdTogether Android SDK

[![Maven Central](https://img.shields.io/maven-central/v/com.adtogether/sdk)](https://central.sonatype.com/namespace/com.adtogether)

<p align="center">
  <strong>"Shown an ad, get ad shown"</strong><br>
  The Universal Ad Exchange & Reciprocal Marketing Platform
</p>

**AdTogether** is a state-of-the-art ad exchange platform designed to empower developers and creators. By participating in our network, you can engage in reciprocal marketing for your own applications while simultaneously driving traffic to your products. Our core philosophy is simple: **"Shown an ad, get ad shown"**.

This SDK allows Android developers to easily integrate AdTogether ads into their applications. By displaying ads from other community members, you earn "Ad Credits" that allow your own app's ads to be shown across the AdTogether network.

## Features

- **Jetpack Compose**: Native composables for modern Android development.
- **Fair Exchange**: Automated tracking of impressions to ensure fair distribution of ad credits.
- **Easy Integration**: Distributed via Maven Central.

## Getting started

Add the dependency to your app-level `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.adtogether:sdk:1.0.0")
}
```

## Usage

```kotlin
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.adtogether.sdk.AdTogetherBanner

@Composable
fun MainScreen() {
    Column(modifier = Modifier.fillMaxSize()) {
        // Your App Content Here
        Spacer(modifier = Modifier.weight(1f))
        
        // Display the Ad Together Banner
        AdTogetherBanner(
            appId = "YOUR_APP_ID",
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        )
    }
}
```

## Additional information

- **Documentation**: For full documentation, visit [adtogether.relaxsoftwareapps.com/docs](https://adtogether.relaxsoftwareapps.com/docs).
- **Issues**: Found a bug? File an issue on our [GitHub repository](https://github.com/AdTogether/AdTogether/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
