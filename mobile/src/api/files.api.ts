import { apiClient } from './client';
import type { ApiSuccess } from '../types/api';
import type { SafeFile } from '../types/storage';

export async function getFileDetailsApi(fileId: string): Promise<SafeFile> {
  const response = await apiClient.get<ApiSuccess<{ file: SafeFile }>>(`/files/${fileId}`);
  return response.data.data.file;
}

export async function getPreviewUrlApi(
  fileId: string
): Promise<{ url: string; expiresInSeconds: number }> {
  const response = await apiClient.get<
    ApiSuccess<{ url: string; expiresInSeconds: number }>
  >(`/files/${fileId}/preview-url`);
  return response.data.data;
}

export async function getDownloadUrlApi(
  fileId: string
): Promise<{ url: string; expiresInSeconds: number }> {
  const response = await apiClient.get<
    ApiSuccess<{ url: string; expiresInSeconds: number }>
  >(`/files/${fileId}/download-url`);
  return response.data.data;
}

export async function uploadFileApi(
  file: { uri: string; name: string; type: string },
  folderId?: string | null,
  onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
): Promise<SafeFile> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  if (folderId) {
    formData.append('folderId', folderId);
  }

  const response = await apiClient.post<ApiSuccess<{ file: SafeFile }>>('/files', formData, {
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent, progressEvent.loaded, progressEvent.total);
      }
    },
  });
  return response.data.data.file;
}

export async function updateFileApi(
  fileId: string,
  payload: { name?: string; folderId?: string | null }
): Promise<SafeFile> {
  const response = await apiClient.patch<ApiSuccess<{ file: SafeFile }>>(
    `/files/${fileId}`,
    payload
  );
  return response.data.data.file;
}

export async function deleteFileApi(fileId: string): Promise<void> {
  await apiClient.delete(`/files/${fileId}`);
}
