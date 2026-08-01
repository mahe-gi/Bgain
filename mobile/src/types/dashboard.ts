import type { SafeFile } from './storage';

export interface DashboardData {
  folderCount: number;
  fileCount: number;
  totalSizeBytes: number;
  recentFiles: SafeFile[];
}
