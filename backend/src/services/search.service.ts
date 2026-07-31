import { prisma } from "../lib/prisma.js";
import { toSafeFolder, SafeFolder } from "./folder.service.js";
import { toSafeFile, SafeFile } from "./file.service.js";

export interface SearchResultData {
  query: string;
  folders: SafeFolder[];
  files: SafeFile[];
  total: number;
}

export class SearchService {
  static async searchGlobal(queryText: string): Promise<SearchResultData> {
    const [folderRecords, fileRecords] = await Promise.all([
      prisma.folder.findMany({
        where: {
          name: {
            contains: queryText,
            mode: "insensitive"
          }
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 100
      }),
      prisma.file.findMany({
        where: {
          name: {
            contains: queryText,
            mode: "insensitive"
          }
        },
        orderBy: {
          updatedAt: "desc"
        },
        take: 100
      })
    ]);

    type SearchItem =
      | { kind: "folder"; item: (typeof folderRecords)[0]; updatedAt: Date }
      | { kind: "file"; item: (typeof fileRecords)[0]; updatedAt: Date };

    const combined: SearchItem[] = [
      ...folderRecords.map((f) => ({
        kind: "folder" as const,
        item: f,
        updatedAt: f.updatedAt
      })),
      ...fileRecords.map((f) => ({
        kind: "file" as const,
        item: f,
        updatedAt: f.updatedAt
      }))
    ];

    // Sort deterministically by updatedAt desc, then by id
    combined.sort((a, b) => {
      const timeDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.item.id.localeCompare(a.item.id);
    });

    const sliced = combined.slice(0, 100);

    const folders = sliced
      .filter((s): s is SearchItem & { kind: "folder" } => s.kind === "folder")
      .map((s) => toSafeFolder(s.item));

    const files = sliced
      .filter((s): s is SearchItem & { kind: "file" } => s.kind === "file")
      .map((s) => toSafeFile(s.item));

    return {
      query: queryText,
      folders,
      files,
      total: folders.length + files.length
    };
  }
}
