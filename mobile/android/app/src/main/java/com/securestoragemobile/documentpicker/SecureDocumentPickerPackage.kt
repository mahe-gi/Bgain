package com.securestoragemobile.documentpicker

import android.util.Log
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class SecureDocumentPickerPackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    Log.d(TAG, "SecureDocumentPickerPackage.getModule() queried for: $name")
    return if (name == NativeSecureDocumentPickerSpec.NAME) {
      SecureDocumentPickerModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    Log.d(TAG, "SecureDocumentPickerPackage.getReactModuleInfoProvider() queried")
    return ReactModuleInfoProvider {
      val moduleInfos = mapOf(
        NativeSecureDocumentPickerSpec.NAME to ReactModuleInfo(
          NativeSecureDocumentPickerSpec.NAME,
          NativeSecureDocumentPickerSpec.NAME,
          false, // canOverrideExistingModule
          false, // needsEagerInit
          false, // isCxxModule
          true   // isTurboModule
        )
      )
      moduleInfos
    }
  }

  companion object {
    private const val TAG = "NativeSecureDocumentPicker"
  }
}
