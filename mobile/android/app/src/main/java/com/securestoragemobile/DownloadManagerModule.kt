package com.securestoragemobile

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DownloadManagerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "DownloadManagerModule"
    }

    @ReactMethod
    fun enqueueDownload(url: String, fileName: String, promise: Promise) {
        try {
            // Sanitize filename: strip path separators, double dots, null bytes, and non-printable chars
            var sanitizedName = fileName
                .replace("\\", "_")
                .replace("/", "_")
                .replace("..", "_")
                .replace("\u0000", "")
                .trim()

            if (sanitizedName.isEmpty()) {
                sanitizedName = "downloaded_file"
            }

            val downloadManager = reactApplicationContext.getSystemService(Context.DOWNLOAD_SERVICE) as? DownloadManager
                ?: throw IllegalStateException("DownloadManager service not available on device")

            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setTitle(sanitizedName)
                setDescription("Downloading file from BGain Gateway")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, sanitizedName)
                setAllowedOverMetered(true)
                setAllowedOverRoaming(true)
            }

            val downloadId = downloadManager.enqueue(request)
            promise.resolve(downloadId.toString())
        } catch (e: Exception) {
            promise.reject("DOWNLOAD_ERROR", "Failed to enqueue download: ${e.message}", e)
        }
    }
}
