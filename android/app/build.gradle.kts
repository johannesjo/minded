plugins {
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.jetbrainsKotlinAndroid)
    alias(libs.plugins.devtoolsKsp)
}

android {
    namespace = "com.minded.minded"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.minded.minded"
        minSdk = 29
        targetSdk = 35
        // In CI both pipelines set ANDROID_VERSION_CODE to a time-based value
        // (seconds since 2020-01-01) so production always builds at or above the
        // latest internal-test build and Play's cross-track shadowing rule is
        // never tripped. This literal is only the local-build fallback; the
        // user-facing version is versionName below. See RELEASING.md.
        versionCode = System.getenv("ANDROID_VERSION_CODE")?.toIntOrNull() ?: 25
        versionName = "7.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    signingConfigs {
        create("release") {
            // Sourced from env vars in CI (see .github/workflows/release.yml).
            // Fallback path lets non-release Gradle tasks configure cleanly;
            // bundleRelease/assembleRelease will fail loudly if env is unset.
            storeFile = file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "missing.jks")
            storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("ANDROID_KEY_ALIAS")
            keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.10"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.glance.appwidget)
    implementation(libs.androidx.appcompat)

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)

    implementation(libs.androidx.preference.ktx)

    testImplementation(libs.junit)
    testImplementation("org.mockito:mockito-core:5.3.1")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.0.0")
    testImplementation("org.jetbrains.kotlin:kotlin-test:1.8.0")
    testImplementation("org.json:json:20240303")
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
