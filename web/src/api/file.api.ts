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
