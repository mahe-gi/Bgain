import { apiClient } from "./client.js";
import type { ApiSuccessEnvelope } from "../types/api.js";
import type { Folder, FileItem, GetFoldersParams, GetFilesParams } from "../types/storage.js";

export async function getFoldersApi(params: GetFoldersParams): Promise<Folder[]> {
  const response = await apiClient.get<ApiSuccessEnvelope<{ folders: Folder[] }>>("/folders", {
    params: {
      parentId: params.parentId,
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params.order ? { order: params.order } : {})
    }
  });
  return response.data.data.folders;
}

export async function getFilesApi(params: GetFilesParams): Promise<FileItem[]> {
  const response = await apiClient.get<ApiSuccessEnvelope<{ files: FileItem[] }>>("/files", {
    params: {
      folderId: params.folderId,
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params.order ? { order: params.order } : {})
    }
  });
  return response.data.data.files;
}
