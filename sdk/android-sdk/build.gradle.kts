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
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")

    val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("io.coil-kt:coil-compose:2.5.0")

    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("com.github.bumptech.glide:glide:4.16.0")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
}

group = "com.relaxsoftwareapps.adtogether"
version = "0.5.0"

mavenPublishing {
    publishToMavenCentral(SonatypeHost.CENTRAL_PORTAL)

    pom {
        name.set("AdTogether Android SDK")
        description.set("The official AdTogether Android SDK — reciprocal ad exchange to increase conversions and grow your audience.")
        url.set("https://www.ad-together.org")

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
            connection.set("scm:git:github.com/undecided2003/adtogether-android-sdk.git")
            developerConnection.set("scm:git:ssh://github.com/undecided2003/adtogether-android-sdk.git")
            url.set("https://github.com/undecided2003/adtogether-android-sdk")
        }
    }

    if (project.hasProperty("signing.keyId") || project.hasProperty("signingInMemoryKeyId")) {
        signAllPublications()
    }

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
