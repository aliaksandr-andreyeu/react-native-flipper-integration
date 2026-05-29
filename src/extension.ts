/**
 * Custom Flipper plugins are registered from native code before `client.start()`.
 *
 * Android (Kotlin/Java), in `Application.onCreate` or early `MainActivity`:
 * ```kotlin
 * import com.flipperintegration.FlipperIntegration
 * import com.facebook.flipper.android.AndroidFlipperClient
 *
 * FlipperIntegration.addPluginInitializer { client: AndroidFlipperClient ->
 *   client.addPlugin(MyCustomFlipperPlugin())
 * }
 * ```
 *
 * iOS (Objective-C), in `application:didFinishLaunchingWithOptions:` before JS loads:
 * ```objc
 * #import "FlipperIntegrationConfig.h"
 *
 * FlipperIntegrationRegisterPluginSetup(^(id client) {
 *   // client is FlipperClient* when FlipperKit is linked
 * });
 * ```
 *
 * Call these hooks before the module auto-initializes, or rely on `initializeFlipper()`
 * after registering hooks (first `start()` wins; use early registration when possible).
 */
export {};
