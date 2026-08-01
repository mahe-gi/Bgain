/**
 * Format bytes into readable size strings (B, KB, MB, GB, TB).
 * Handles 0 B explicitly.
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `${bytes} B`;
  const val = (bytes / Math.pow(k, i)).toFixed(1);
  return `${val} ${sizes[i]}`;
}

/**
 * Format an ISO date string into a user-friendly localized date string.
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

/**
 * Get a user-friendly label for common MIME types.
 */
export function getFileTypeLabel(mimeType: string): string {
  if (!mimeType) return 'File';

  switch (mimeType.toLowerCase()) {
    case 'application/pdf':
      return 'PDF Document';
    case 'image/jpeg':
    case 'image/jpg':
      return 'JPEG Image';
    case 'image/png':
      return 'PNG Image';
    case 'text/plain':
      return 'Text File';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'Word Document (.docx)';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'Excel Spreadsheet (.xlsx)';
    default:
      if (mimeType.startsWith('image/')) return 'Image File';
      if (mimeType.startsWith('text/')) return 'Text File';
      if (mimeType.startsWith('video/')) return 'Video File';
      if (mimeType.startsWith('audio/')) return 'Audio File';
      return 'File';
  }
}
