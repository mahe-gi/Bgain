import type { Folder, FileItem } from "./storage.js";

export interface SearchResult {
  query: string;
  folders: Folder[];
  files: FileItem[];
  total: number;
}
