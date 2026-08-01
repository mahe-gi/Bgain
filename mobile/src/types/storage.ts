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
