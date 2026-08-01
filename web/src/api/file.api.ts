import { apiClient } from "./client.js";
import type { ApiSuccessEnvelope } from "../types/api.js";
import type { FileItem } from "../types/storage.js";
import type { FileSignedUrlResponse } from "../types/file.js";

export async function getFileDetailsApi(fileId: string): Promise<FileItem> {
  const response = await apiClient.get<ApiSuccessEnvelope<{ file: FileItem }>>(`/files/${fileId}`);
  return response.data.data.file;
}

export async function getPreviewUrlApi(fileId: string): Promise<FileSignedUrlResponse> {
  const response = await apiClient.get<ApiSuccessEnvelope<FileSignedUrlResponse>>(`/files/${fileId}/preview-url`);
  return response.data.data;
}

export async function getDownloadUrlApi(fileId: string): Promise<FileSignedUrlResponse> {
  const response = await apiClient.get<ApiSuccessEnvelope<FileSignedUrlResponse>>(`/files/${fileId}/download-url`);
  return response.data.data;
}

export async function uploadFileApi(
  file: File,
  folderId: string | null,
  onProgress?: (percent: number) => void
): Promise<FileItem> {
  const formData = new FormData();
  formData.append("file", file);
  if (folderId && folderId !== "root") {
    formData.append("folderId", folderId);
  }

  const response = await apiClient.post<ApiSuccessEnvelope<{ file: FileItem }>>("/files", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    }
  });

  return response.data.data.file;
}

export async function updateFileApi(
  id: string,
  data: { name?: string; folderId?: string | null }
): Promise<FileItem> {
  const response = await apiClient.patch<ApiSuccessEnvelope<{ file: FileItem }>>(`/files/${id}`, data);
  return response.data.data.file;
}

export async function deleteFileApi(id: string): Promise<void> {
  await apiClient.delete(`/files/${id}`);
}
