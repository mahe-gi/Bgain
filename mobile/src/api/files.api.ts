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
