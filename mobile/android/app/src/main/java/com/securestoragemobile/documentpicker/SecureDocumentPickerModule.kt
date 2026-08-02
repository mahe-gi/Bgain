package com.securestoragemobile.documentpicker

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class SecureDocumentPickerModule(private val reactContext: ReactApplicationContext) :
    NativeSecureDocumentPickerSpec(reactContext), ActivityEventListener {

  private var pendingPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
    Log.d(TAG, "NativeSecureDocumentPickerModule constructed successfully")
  }

  override fun isAvailable(promise: Promise) {
    Log.d(TAG, "NativeSecureDocumentPickerModule.isAvailable() called")
    promise.resolve(true)
  }

  override fun pickDocument(promise: Promise) {
    Log.d(TAG, "NativeSecureDocumentPickerModule.pickDocument() called")

    if (pendingPromise != null) {
      promise.reject("DOCUMENT_PICKER_BUSY", "Document picker activity is already active")
      return
    }

    val currentAct = currentActivity
    if (currentAct == null) {
      promise.reject("ACTIVITY_NOT_FOUND", "Activity does not exist")
      return
    }

    pendingPromise = promise

    try {
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = "*/*"
        val mimeTypes = arrayOf(
          "application/pdf",
          "image/jpeg",
          "image/png",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes)
      }
      currentAct.startActivityForResult(intent, REQUEST_CODE)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to start document picker intent", e)
      pendingPromise?.reject("PICKER_ERROR", "Failed to open document picker", e)
      pendingPromise = null
    }
  }

  override fun onActivityResult(
      activity: Activity,
      requestCode: Int,
      resultCode: Int,
      data: Intent?
  ) {
    if (requestCode != REQUEST_CODE) return

    val promise = pendingPromise ?: return
    pendingPromise = null

    if (resultCode == Activity.RESULT_CANCELED) {
      promise.reject("DOCUMENT_PICKER_CANCELED", "User canceled document picker")
      return
    }

    if (resultCode != Activity.RESULT_OK || data == null) {
      promise.reject("DOCUMENT_PICKER_FAILED", "Failed to select document")
      return
    }

    val uri: Uri? = data.data
    if (uri == null) {
      promise.reject("DOCUMENT_PICKER_INVALID_URI", "Selected document URI is null")
      return
    }

    try {
      var displayName = "document"
      var fileSize: Double? = null

      reactContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
        if (cursor.moveToFirst()) {
          val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
          if (nameIndex != -1 && !cursor.isNull(nameIndex)) {
            displayName = cursor.getString(nameIndex)
          }

          val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
          if (sizeIndex != -1 && !cursor.isNull(sizeIndex)) {
            fileSize = cursor.getDouble(sizeIndex)
          }
        }
      }

      val mimeType = reactContext.contentResolver.getType(uri) ?: "application/octet-stream"

      val result = Arguments.createMap().apply {
        putString("uri", uri.toString())
        putString("name", displayName)
        putString("type", mimeType)
        if (fileSize != null) {
          putDouble("size", fileSize!!)
        } else {
          putNull("size")
        }
      }

      promise.resolve(result)
    } catch (e: Exception) {
      Log.e(TAG, "Error resolving selected document info", e)
      promise.reject("DOCUMENT_PICKER_ERROR", "Error resolving document info", e)
    }
  }

  override fun onNewIntent(intent: Intent) {
    // No-op required by ActivityEventListener interface
  }

  companion object {
    private const val TAG = "NativeSecureDocumentPicker"
    private const val REQUEST_CODE = 9876
  }
}
