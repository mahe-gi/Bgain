import type { SafeFolder, SafeFile } from './storage';

export interface SearchResultData {
  query: string;
  folders: SafeFolder[];
  files: SafeFile[];
  total: number;
}
