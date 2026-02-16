plugins {
  id("com.android.library")
  kotlin("android")
}

android {
  namespace = "ca.liminalhq.haptics"
  compileSdk = 35

  defaultConfig {
    minSdk = 24
  }
}

dependencies {
  implementation("app.tauri:tauri-android:2.+")
}
