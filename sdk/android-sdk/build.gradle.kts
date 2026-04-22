import com.vanniktech.maven.publish.SonatypeHost
import com.vanniktech.maven.publish.AndroidSingleVariantLibrary

plugins {
    id("com.android.library") version "8.5.2"
    id("org.jetbrains.kotlin.android") version "1.9.24"
    id("com.vanniktech.maven.publish") version "0.30.0"
}

android {
    namespace = "com.adtogether.sdk"
    compileSdk = 34

    defaultConfig {
        minSdk = 21
    }

    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }

    // Publishing is handled by the com.vanniktech.maven.publish plugin below
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    
    // Compose dependencies
    val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    
    // Network & Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    // implementation("org.json:json:20231013") // Conflicts with Android built-in json
    implementation("io.coil-kt:coil-compose:2.5.0")
}


mavenPublishing {
    // Defines the coordinates
    coordinates("com.relaxsoftwareapps.adtogether", "sdk", "0.1.24")
    
    // Configures the POM
    pom {
        name.set("AdTogether Android SDK")
        description.set("The official AdTogether Android SDK — reciprocal ad exchange to increase conversions and grow your audience.")
        url.set("https://adtogether.relaxsoftwareapps.com")
        licenses {
            license {
                name.set("MIT License")
                url.set("https://opensource.org/licenses/MIT")
            }
        }
        developers {
            developer {
                id.set("adtogether")
                name.set("AdTogether Team")
                email.set("info1@relaxsoftwareapps.com")
            }
        }
        scm {
            connection.set("scm:git:github.com/undecided2003/AdTogether.git")
            developerConnection.set("scm:git:ssh://github.com/undecided2003/AdTogether.git")
            url.set("https://github.com/undecided2003/AdTogether/tree/main/sdk/android-sdk")
        }
    }

    // Configures the publishing to Central Portal
    publishToMavenCentral(SonatypeHost.CENTRAL_PORTAL)
    
    // Automatic signing - only if credentials are provided
    if (project.hasProperty("signing.keyId") || 
        project.hasProperty("signingKeyId") ||
        System.getenv("SIGNING_KEY") != null) {
        signAllPublications()
    }
    
    // Configure the Android Library variant
    configure(AndroidSingleVariantLibrary("release"))
}

publishing {
    repositories {
        maven {
            name = "StagingLocal"
            url = uri(layout.buildDirectory.dir("stagingLocalRepository"))
        }
    }
}
