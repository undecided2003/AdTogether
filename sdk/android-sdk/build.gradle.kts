plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("maven-publish")
    id("signing")
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
        kotlinCompilerExtensionVersion = "1.5.1"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }

    publishing {
        singleVariant("release") {
            withSourcesJar()
            withJavadocJar()
        }
    }
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
    implementation("org.json:json:20231013") // Or use org.json provided by Android
    // Coil for image loading in compose
    implementation("io.coil-kt:coil-compose:2.5.0")
}

afterEvaluate {
    publishing {
        publications {
            create<MavenPublication>("release") {
                groupId = "com.adtogether"
                artifactId = "sdk"
                version = "0.1.0"
                
                // For Android library, use the release component
                from(components["release"])
                
                pom {
                    name.set("AdTogether Android SDK")
                    description.set("The official AdTogether Android SDK for monetizing applications.")
                    url.set("https://adtogether.com")
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
                            email.set("support@adtogether.com")
                        }
                    }
                    scm {
                        connection.set("scm:git:github.com/AdTogether/AdTogether.git")
                        developerConnection.set("scm:git:ssh://github.com/AdTogether/AdTogether.git")
                        url.set("https://github.com/AdTogether/AdTogether/tree/main/sdk/android-sdk")
                    }
                }
            }
        }
        
        repositories {
            maven {
                name = "Sonatype"
                val releaseRepoUrl = "https://s01.oss.sonatype.org/service/local/staging/deploy/maven2/"
                val snapshotRepoUrl = "https://s01.oss.sonatype.org/content/repositories/snapshots/"
                url = uri(if (version.toString().endsWith("SNAPSHOT")) snapshotRepoUrl else releaseRepoUrl)
                
                credentials {
                    username = project.findProperty("ossrhUsername")?.toString() ?: System.getenv("OSSRH_USERNAME")
                    password = project.findProperty("ossrhPassword")?.toString() ?: System.getenv("OSSRH_PASSWORD")
                }
            }
        }
    }
}

signing {
    val signingKey = project.findProperty("signingKey")?.toString() ?: System.getenv("SIGNING_KEY")
    val signingPassword = project.findProperty("signingPassword")?.toString() ?: System.getenv("SIGNING_PASSWORD")
    if (signingKey != null && signingPassword != null) {
        useInMemoryPgpKeys(signingKey, signingPassword)
        sign(publishing.publications["release"])
    }
}
