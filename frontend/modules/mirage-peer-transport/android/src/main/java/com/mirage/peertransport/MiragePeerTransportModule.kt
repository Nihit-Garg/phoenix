package com.mirage.peertransport

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MiragePeerTransportModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MiragePeerTransport")

    Events("onChange")

    Function("hello") {
      "Hello world! 👋"
    }
  }
}
