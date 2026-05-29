package com.flipperintegration

import android.content.Context
import com.facebook.flipper.android.AndroidFlipperClient
import com.facebook.flipper.android.utils.FlipperUtils
import com.facebook.flipper.plugins.inspector.DescriptorMapping
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin
import com.facebook.flipper.plugins.network.FlipperOkhttpInterceptor
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin
import com.facebook.react.modules.network.NetworkingModule
import okhttp3.OkHttpClient

class FlipperIntegrationDelegateImpl : FlipperIntegrationDelegate {
  override fun shouldEnable(context: Context): Boolean {
    return FlipperUtils.shouldEnableFlipper(context)
  }

  override fun initialize(context: Context, pluginInitializers: List<(Any) -> Unit>) {
    val client = AndroidFlipperClient.getInstance(context)
    client.addPlugin(InspectorFlipperPlugin(context, DescriptorMapping.withDefaults()))

    val networkPlugin = NetworkFlipperPlugin()
    NetworkingModule.setCustomClientBuilder { builder: OkHttpClient.Builder ->
      builder.addNetworkInterceptor(FlipperOkhttpInterceptor(networkPlugin))
    }
    client.addPlugin(networkPlugin)

    pluginInitializers.forEach { initializer -> initializer(client) }
    client.start()
  }
}
