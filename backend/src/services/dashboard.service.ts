import { prisma } from "../lib/prisma.js";
import { toSafeFile, SafeFile } from "./file.service.js";

export interface DashboardData {
  folderCount: number;
  fileCount: number;
  totalSizeBytes: number;
  recentFiles: SafeFile[];
}

export class DashboardService {
  static async getDashboardData(): Promise<DashboardData> {
    const [folderCount, fileCount, sizeAggregation, recentFileRecords] =
      await Promise.all([
        prisma.folder.count(),
        prisma.file.count(),
        prisma.file.aggregate({
          _sum: {
            sizeBytes: true
          }
        }),
        prisma.file.findMany({
          orderBy: {
            createdAt: "desc"
          },
          take: 5
        })
      ]);

    const totalSizeBytes = sizeAggregation._sum.sizeBytes ?? 0;
    const recentFiles = recentFileRecords.map(toSafeFile);

    return {
      folderCount,
      fileCount,
      totalSizeBytes,
      recentFiles
    };
  }
}
