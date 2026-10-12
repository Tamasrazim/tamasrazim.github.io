plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.tamasrazim.phasebreak"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.tamasrazim.phasebreak"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildTypes {
        release {
            // Release signing is intentionally not faked. A production APK needs a private signing key.
            isMinifyEnabled = false
        }
    }
}
