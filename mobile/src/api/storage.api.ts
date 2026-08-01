import { apiClient } from './client';
import type { ApiSuccess } from '../types/api';
import type { SafeFolder, SafeFile, FolderQueryInput, FileQueryInput } from '../types/storage';

export async function getFoldersApi(params?: FolderQueryInput): Promise<SafeFolder[]> {
  const response = await apiClient.get<ApiSuccess<{ folders: SafeFolder[] }>>('/folders', {
    params: {
      parentId: params?.parentId || 'root',
      sortBy: params?.sortBy || 'name',
      order: params?.order || 'asc',
    },
  });
  return response.data.data.folders;
}

export async function getFilesApi(params?: FileQueryInput): Promise<SafeFile[]> {
  const response = await apiClient.get<ApiSuccess<{ files: SafeFile[] }>>('/files', {
    params: {
      folderId: params?.folderId || 'root',
      sortBy: params?.sortBy || 'name',
      order: params?.order || 'asc',
    },
  });
  return response.data.data.files;
}
