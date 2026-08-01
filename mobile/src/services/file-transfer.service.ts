import { NativeModules, Platform, Linking } from 'react-native';
import { getDownloadUrlApi } from '../api/files.api';

const { DownloadManagerModule } = NativeModules;

/**
 * Sanitize filename to prevent path traversal or invalid filesystem characters.
 */
export function sanitizeFileName(name: string): string {
  /* eslint-disable no-control-regex */
  const sanitized = name
    .replace(/[/]/g, '_')
    .replace(/[\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
  /* eslint-enable no-control-regex */
  return sanitized.length > 0 ? sanitized : 'downloaded_file';
}

/**
 * Maximum permitted TXT preview file size (500 KB).
 */
export const MAX_TXT_PREVIEW_SIZE_BYTES = 500 * 1024; // 512,000 bytes

/**
 * Fetch plain text preview content from an unauthenticated R2 pre-signed URL.
 * Strictly avoids sending backend Authorization headers to third-party R2 storage.
 * Refuses text files larger than 500 KB before rendering.
 */
export async function fetchTxtPreviewContent(
  previewUrl: string,
  fileSizeBytes?: number
): Promise<string> {
  if (fileSizeBytes && fileSizeBytes > MAX_TXT_PREVIEW_SIZE_BYTES) {
    throw new Error('Text file is too large to preview (> 500 KB). Please download the file to view its content.');
  }

  const response = await fetch(previewUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/plain, */*',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to retrieve text preview content.');
  }

  const text = await response.text();

  if (text.length > MAX_TXT_PREVIEW_SIZE_BYTES) {
    throw new Error('Text file exceeds maximum preview length (> 500 KB). Please download the file to view its content.');
  }

  return text;
}

/**
 * Trigger a real Android DownloadManager download.
 * Requests a fresh pre-signed R2 URL from backend and enqueues via native Android DownloadManager.
 * Does NOT transmit backend Bearer tokens to R2.
 */
export async function downloadFileSecurely(
  fileId: string,
  fileName: string
): Promise<{ downloadId: string }> {
  const { url } = await getDownloadUrlApi(fileId);
  if (!url) {
    throw new Error('Download URL could not be generated.');
  }

  const safeName = sanitizeFileName(fileName);

  if (Platform.OS === 'android' && DownloadManagerModule?.enqueueDownload) {
    const downloadId = await DownloadManagerModule.enqueueDownload(url, safeName);
    return { downloadId: String(downloadId) };
  } else {
    // Fallback path
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      throw new Error('Unable to open download URL on this device.');
    }
    await Linking.openURL(url);
    return { downloadId: 'system_browser' };
  }
}
