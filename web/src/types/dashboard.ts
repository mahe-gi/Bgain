import type { FileItem } from "./storage.js";

export interface DashboardData {
  folderCount: number;
  fileCount: number;
  totalSizeBytes: number;
  recentFiles: FileItem[];
}
