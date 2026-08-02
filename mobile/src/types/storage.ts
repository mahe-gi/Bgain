export interface SafeFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafeFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string | null;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface FolderQueryInput {
  parentId?: string;
  sortBy?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface FileQueryInput {
  folderId?: string;
  sortBy?: 'name' | 'createdAt' | 'sizeBytes';
  order?: 'asc' | 'desc';
}

export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};
