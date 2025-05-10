package co.median.android

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ComponentName
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Parcelable
import android.provider.MediaStore
import android.util.Log
import android.webkit.MimeTypeMap
import android.webkit.WebChromeClient.FileChooserParams
import androidx.activity.result.contract.ActivityResultContract
import androidx.core.content.FileProvider
import co.median.median_core.AppConfig
import co.median.median_core.dto.CameraConfig
import co.median.median_core.dto.CaptureQuality
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class FileUploadContract : ActivityResultContract<FileUploadOptions, FileUploadResult>() {
    private lateinit var context: Context
    private lateinit var cameraConfig: CameraConfig
    private var cameraImageUri: Uri? = null
    private var cameraVideoUri: Uri? = null
    private var mimeTypes: MutableList<String> = mutableListOf()
    private var fileUploadOptions: FileUploadOptions? = null
    private var multiple = false
    private var canSaveToPublicStorage = false
    private var canUseCamera = false
    private var directCameraUploads = false

    override fun createIntent(context: Context, input: FileUploadOptions): Intent {
        this.context = context
        this.fileUploadOptions = input

        val appConfig = AppConfig.getInstance(context)
        this.cameraConfig = appConfig.cameraConfig
        this.directCameraUploads = appConfig.directCameraUploads

        this.canUseCamera = input.canUseCamera
        this.canSaveToPublicStorage = input.canSaveToPublicStorage
        this.mimeTypes = input.mimeTypes

        if (input.fileChooserParams.mode == FileChooserParams.MODE_OPEN_MULTIPLE) {
            multiple = true
        }

        if (input.fileChooserParams.isCaptureEnabled) {
            return cameraIntent()
        }

        return createChooserIntent()
    }

    @SuppressLint("IntentReset")
    fun createChooserIntent(): Intent {
        val directCaptureIntents = arrayListOf<Intent>()
        if (imagesAllowed()) {
            directCaptureIntents.addAll(photoCameraIntents())
        }
        if (videosAllowed()) {
            directCaptureIntents.addAll(videoCameraIntents())
        }

        val chooserIntent: Intent?
        val mediaIntent: Intent?

        if (imagesAllowed() xor videosAllowed()) {
            mediaIntent = getMediaInitialIntent()
            mediaIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple)
            chooserIntent = Intent.createChooser(
                mediaIntent,
                context.getString(R.string.choose_action)
            )
        } else if (fileUploadOptions?.onlyImagesAndVideo() == true && !isGooglePhotosDefaultApp()) {
            mediaIntent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
            mediaIntent.type = "image/*, video/*"
            mediaIntent.putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*"))
            mediaIntent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple)
            chooserIntent = Intent.createChooser(
                mediaIntent,
                context.getString(R.string.choose_action)
            )
        } else {
            chooserIntent = Intent.createChooser(
                filePickerIntent(),
                context.getString(R.string.choose_action)
            )
        }

        chooserIntent.putExtra(
            Intent.EXTRA_INITIAL_INTENTS,
            directCaptureIntents.toTypedArray<Parcelable>()
        )

        return chooserIntent
    }

    private fun photoCameraIntents(): ArrayList<Intent> {
        val intents = arrayListOf<Intent>()

        val appConfig = AppConfig.getInstance(context)
        if (!appConfig.directCameraUploads) {
            return intents
        }

        val captureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        applyPhotoCameraSettings(captureIntent)

        val resolveList: List<ResolveInfo> = listOfAvailableAppsForIntent(captureIntent)
        for (resolve in resolveList) {
            val packageName = resolve.activityInfo.packageName
            val intent = Intent(captureIntent)
            intent.component =
                ComponentName(resolve.activityInfo.packageName, resolve.activityInfo.name)
            intent.setPackage(packageName)
            intents.add(intent)
        }

        return intents
    }

    private fun applyPhotoCameraSettings(captureIntent: Intent) {
        cameraImageUri = createTempOutputUri()
        captureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri)
    }

    private fun videoCameraIntents(): ArrayList<Intent> {
        val intents = arrayListOf<Intent>()

        if (!directCameraUploads) {
            return intents
        }

        val captureIntent = Intent(MediaStore.ACTION_VIDEO_CAPTURE)
        applyVideoCameraSettings(captureIntent)

        val resolveList: List<ResolveInfo> = listOfAvailableAppsForIntent(captureIntent)
        for (resolve in resolveList) {
            val packageName = resolve.activityInfo.packageName
            val intent = Intent(captureIntent)
            intent.component =
                ComponentName(resolve.activityInfo.packageName, resolve.activityInfo.name)
            intent.setPackage(packageName)

            intents.add(intent)
        }

        return intents
    }

    private fun applyVideoCameraSettings(videoIntent: Intent) {
        if (cameraConfig.captureQuality == CaptureQuality.HIGH) {
            videoIntent.putExtra(MediaStore.EXTRA_VIDEO_QUALITY, 1)
        } else {
            videoIntent.putExtra(MediaStore.EXTRA_VIDEO_QUALITY, 0)
        }

        cameraVideoUri = createTempOutputUri(isVideo = true)
        videoIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraVideoUri)
    }

    private fun createTempOutputUri(isVideo: Boolean = false): Uri {
        // Note: Only one file instance should exist for temporary files to optimize memory usage.
        // The file should not be deleted immediately as the page may use it indefinitely.
        val fileName = if (isVideo) "temp_video_recording.mp4" else "temp_capture_image.jpg"

        // Save file as cache, should be in "downloads" folder as defined in filepaths.xml
        val downloadsDir = File(context.cacheDir, "downloads")
        if (!downloadsDir.exists()) {
            downloadsDir.mkdirs()  // Create the directory if it doesn't exist
        }
        val file = File(downloadsDir, fileName)

        val uri = FileProvider.getUriForFile(
            context,
            "${context.applicationContext.packageName}.fileprovider",
            file
        )

        return uri
    }

    private fun deleteUriFiles() {
        this.cameraImageUri?.let {
            context.contentResolver.delete(it, null, null)
            this.cameraImageUri = null
        }

        this.cameraVideoUri?.let {
            context.contentResolver.delete(it, null, null)
            this.cameraVideoUri = null
        }
    }

    private fun filePickerIntent(): Intent {
        var intent: Intent
        intent = Intent(Intent.ACTION_GET_CONTENT) // or ACTION_OPEN_DOCUMENT
        intent.type = mimeTypes.joinToString(", ")
        intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.toTypedArray())
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple)
        intent.addCategory(Intent.CATEGORY_OPENABLE)

        val resolveList: List<ResolveInfo> = listOfAvailableAppsForIntent(intent)

        if (resolveList.isEmpty() && Build.MANUFACTURER.equals("samsung", ignoreCase = true)) {
            intent = Intent("com.sec.android.app.myfiles.PICK_DATA")
            intent.putExtra("CONTENT_TYPE", "*/*")
            intent.addCategory(Intent.CATEGORY_DEFAULT)
            return intent
        }

        return intent
    }

    private fun cameraIntent(): Intent {
        val mediaIntents = if (imagesAllowed()) {
            photoCameraIntents()
        } else {
            videoCameraIntents()
        }
        return mediaIntents.first()
    }

    private fun imagesAllowed(): Boolean {
        if (!canUseCamera) return false
        return this.fileUploadOptions?.canUploadImage() ?: false
    }

    private fun videosAllowed(): Boolean {
        if (!canUseCamera) return false
        return this.fileUploadOptions?.canUploadVideo() ?: false
    }

    private fun getMediaInitialIntent(): Intent {
        return if (imagesAllowed()) {
            Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
        } else {
            Intent(Intent.ACTION_PICK, MediaStore.Video.Media.EXTERNAL_CONTENT_URI)
        }
    }

    private fun isGooglePhotosDefaultApp(): Boolean {
        val captureIntent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
        val resolveList: List<ResolveInfo> = listOfAvailableAppsForIntent(captureIntent)

        return resolveList.size == 1 && resolveList.first().activityInfo.packageName == "com.google.android.apps.photos"
    }

    private fun listOfAvailableAppsForIntent(intent: Intent): List<ResolveInfo> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.packageManager.queryIntentActivities(
                intent, PackageManager.ResolveInfoFlags.of(
                    PackageManager.MATCH_DEFAULT_ONLY.toLong()
                )
            )
        } else {
            @Suppress("DEPRECATION")
            context.packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
        }
    }

    override fun parseResult(resultCode: Int, intent: Intent?): FileUploadResult {

        if (resultCode != Activity.RESULT_OK) {
            deleteUriFiles()
            return FileUploadResult(false, null)
        }

        // from documents
        if (intent != null) {

            // single document or video
            intent.data?.let {

                // check if video and process
                this.cameraVideoUri?.let {
                    if (it.isValidFile(context)) {
                        val resultUri = FileChooserParams.parseResult(resultCode, intent)?.get(0)
                        val isSame = it.normalizeScheme() == (resultUri?.normalizeScheme() ?: false)

                        if (isSame) {
                            val uploadUri = if (cameraConfig.saveToGallery && canSaveToPublicStorage)
                                copyAndSaveMediaFileToGallery(it, "video") else it
                            return FileUploadResult(true, arrayOf(uploadUri))
                        }
                    }
                }

                return FileUploadResult(true, FileChooserParams.parseResult(resultCode, intent))
            }

            // multiple documents and media
            intent.clipData?.let { clipData ->
                val files = (0 until clipData.itemCount)
                    .mapNotNull { index -> clipData.getItemAt(index).uri }
                return FileUploadResult(true, files.toTypedArray())
            }
        }

        // from camera
        this.cameraImageUri?.let {
            if (it.isValidFile(context)) {
                val uploadUri = if (cameraConfig.saveToGallery && canSaveToPublicStorage)
                    copyAndSaveMediaFileToGallery(it, "image") else it

                val resizeImage = this.cameraConfig.captureQuality == CaptureQuality.LOW
                return FileUploadResult(true, arrayOf(uploadUri), shouldResizeCameraImage = resizeImage)
            }
        }

        // from video
        this.cameraVideoUri?.let {
            if (it.isValidFile(context)) {
                val uploadUri = if (cameraConfig.saveToGallery && canSaveToPublicStorage)
                    copyAndSaveMediaFileToGallery(it, "video") else it

                return FileUploadResult(true, arrayOf(uploadUri))
            }
        }

        // Should not reach here.
        deleteUriFiles()
        return FileUploadResult(false, null)
    }

    private fun copyAndSaveMediaFileToGallery(
        sourceUri: Uri,
        mediaType: String // "image" or "video"
    ): Uri {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())

        val (fileName, mimeType, mediaStoreUri) = when (mediaType.lowercase()) {
            "image" -> Triple("IMG_$timeStamp.jpg", "image/jpeg", MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
            "video" -> Triple("VID_$timeStamp.mp4", "video/mp4", MediaStore.Video.Media.EXTERNAL_CONTENT_URI)
            else -> throw IllegalArgumentException("Unsupported media type: $mediaType")
        }

        val publicFileUri: Uri? = if (isAndroid10orAbove()) {
            context.contentResolver.insert(
                mediaStoreUri,
                ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, "${Environment.DIRECTORY_DCIM}/Camera")
                }
            )
        } else {
            val cameraDir = File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM),
                "Camera"
            ).apply { mkdirs() }

            val outputFile = File(cameraDir, fileName)
            FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                outputFile
            )
        }

        if (publicFileUri != null) {
            try {
                // Copy temp file to public file
                context.contentResolver.openInputStream(sourceUri)?.use { inputStream ->
                    context.contentResolver.openOutputStream(publicFileUri)?.use { outputStream ->
                        inputStream.copyTo(outputStream)
                    } ?: throw IOException("Failed to open output stream for $publicFileUri")
                } ?: throw IOException("Failed to open input stream for $sourceUri")

                // Delete temp files after successful copy
                deleteUriFiles()

                return publicFileUri
            } catch (e: Exception) {
                Log.e(TAG, "Failed to copy $mediaType to gallery", e)
            }
        }

        // Fallback
        return sourceUri
    }

    // Extension function on Uri to validate content
    private fun Uri.isValidFile(context: Context): Boolean {
        return hasNonZeroFileSize(context) || hasReadableContent(context)
    }

    private fun Uri.hasNonZeroFileSize(context: Context): Boolean {
        return try {
            val projection = arrayOf(MediaStore.MediaColumns.SIZE)
            context.contentResolver.query(this, projection, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val sizeIndex = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                    if (sizeIndex >= 0) {
                        val size = cursor.getLong(sizeIndex)
                        return size > 0
                    }
                }
                false
            } ?: false
        } catch (e: Exception) {
            false
        }
    }

    private fun Uri.hasReadableContent(context: Context): Boolean {
        return try {
            context.contentResolver.openInputStream(this)?.use { inputStream ->
                val buffer = ByteArray(1024)
                var bytesRead: Int
                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    if (bytesRead > 0) return true
                }
                false
            } ?: false
        } catch (e: IOException) {
            false
        }
    }

    companion object {
        @JvmStatic
        fun isAndroid10orAbove(): Boolean {
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
        }

        private const val TAG = "FileUploadContract"
    }
}

data class FileUploadResult(
    val success: Boolean,
    val result: Array<Uri>?,
    val shouldResizeCameraImage: Boolean = false
)

data class FileUploadOptions @JvmOverloads constructor(
    val fileChooserParams: FileChooserParams,
    var mimeTypes: MutableList<String> = mutableListOf(),
    var canUseCamera: Boolean = false,
    var canSaveToPublicStorage: Boolean = false,
) {
    init {
        val acceptTypes = fileChooserParams.acceptTypes

        mimeTypes = acceptTypes.asSequence()
            .map { it.split("[,;\\s]") }
            .flatten()
            .filter { it.contains("/") || it.startsWith(".") }
            .map {
                if (it.startsWith(".")) {
                    return@map MimeTypeMap.getSingleton().getMimeTypeFromExtension(it.substring(1))
                }
                return@map it
            }.filterNotNull()
            .toList().toMutableList()

        if (mimeTypes.isEmpty()) {
            mimeTypes.add("*/*")
        }
    }

    fun onlyImagesAndVideo(): Boolean {
        return mimeTypes.all { it.startsWith("image/") || it.startsWith("video/") }
    }

    fun canUploadImage(): Boolean {
        return mimeTypes.contains("*/*") || mimeTypes.any { it.contains("image/") }
    }

    fun canUploadVideo(): Boolean {
        return mimeTypes.contains("*/*") || mimeTypes.any { it.contains("video/") }
    }

    fun canUploadImageOrVideo(): Boolean {
        return canUploadImage() || canUploadVideo()
    }
}