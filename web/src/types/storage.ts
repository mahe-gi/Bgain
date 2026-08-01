export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string | null;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
}

export type StorageSortField = "name" | "createdAt" | "sizeBytes";
export type SortOrder = "asc" | "desc";

export type SortOptionValue = "name_asc" | "name_desc" | "newest" | "oldest";

export interface GetFoldersParams {
  parentId: string;
  sortBy?: StorageSortField;
  order?: SortOrder;
}

export interface GetFilesParams {
  folderId: string;
  sortBy?: StorageSortField;
  order?: SortOrder;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}
