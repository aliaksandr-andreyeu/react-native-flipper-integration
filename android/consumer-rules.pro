# Flipper is debug-only by default; keep plugin classes when FLIPPER_DEBUG_ONLY=false in release.
-keep class com.facebook.flipper.** { *; }
-dontwarn com.facebook.flipper.**
