import { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/app-error.js";
import { StorageService } from "./storage.service.js";
import {
  FolderQueryInput,
  CreateFolderInput,
  UpdateFolderInput
} from "../schemas/folder.schema.js";

export interface SafeFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export const toSafeFolder = (folder: {
  id: string;
  name: string;
  parentId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}): SafeFolder => ({
  id: folder.id,
  name: folder.name,
  parentId: folder.parentId,
  createdById: folder.createdById,
  createdAt: folder.createdAt.toISOString(),
  updatedAt: folder.updatedAt.toISOString()
});

export class FolderService {
  static async listFolders(query: FolderQueryInput): Promise<SafeFolder[]> {
    let targetParentId: string | null = null;

    if (query.parentId !== "root") {
      const parentExists = await prisma.folder.findUnique({
        where: { id: query.parentId }
      });
      if (!parentExists) {
        throw new AppError(404, "PARENT_FOLDER_NOT_FOUND", "Parent folder not found");
      }
      targetParentId = query.parentId;
    }

    const folders = await prisma.folder.findMany({
      where: { parentId: targetParentId },
      orderBy: { [query.sortBy]: query.order }
    });

    return folders.map(toSafeFolder);
  }

  static async createFolder(input: CreateFolderInput, userId: string): Promise<SafeFolder> {
    const targetParentId = input.parentId ?? null;

    if (targetParentId !== null) {
      const parentExists = await prisma.folder.findUnique({
        where: { id: targetParentId }
      });
      if (!parentExists) {
        throw new AppError(404, "PARENT_FOLDER_NOT_FOUND", "Parent folder not found");
      }
    }

    const existing = await prisma.folder.findFirst({
      where: {
        parentId: targetParentId,
        name: input.name
      }
    });

    if (existing) {
      throw new AppError(409, "FOLDER_NAME_CONFLICT", "A folder with this name already exists in this location");
    }

    try {
      const folder = await prisma.folder.create({
        data: {
          name: input.name,
          parentId: targetParentId,
          createdById: userId
        }
      });

      return toSafeFolder(folder);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(409, "FOLDER_NAME_CONFLICT", "A folder with this name already exists in this location");
      }
      throw error;
    }
  }

  static async updateFolder(folderId: string, input: UpdateFolderInput): Promise<SafeFolder> {
    const currentFolder = await prisma.folder.findUnique({
      where: { id: folderId }
    });

    if (!currentFolder) {
      throw new AppError(404, "FOLDER_NOT_FOUND", "Folder not found");
    }

    const finalName = input.name !== undefined ? input.name : currentFolder.name;
    const finalParentId = input.parentId !== undefined ? input.parentId : currentFolder.parentId;

    if (input.parentId !== undefined && input.parentId !== null) {
      const targetParentId = input.parentId;

      const targetExists = await prisma.folder.findUnique({
        where: { id: targetParentId }
      });
      if (!targetExists) {
        throw new AppError(404, "PARENT_FOLDER_NOT_FOUND", "Parent folder not found");
      }

      if (folderId === targetParentId) {
        throw new AppError(409, "FOLDER_CYCLE", "A folder cannot be moved into itself or one of its descendants");
      }

      let currParentId: string | null = targetParentId;
      const visited = new Set<string>();

      while (currParentId !== null) {
        if (currParentId === folderId) {
          throw new AppError(409, "FOLDER_CYCLE", "A folder cannot be moved into itself or one of its descendants");
        }
        if (visited.has(currParentId)) {
          break;
        }
        visited.add(currParentId);

        const parentNode: { parentId: string | null } | null = await prisma.folder.findUnique({
          where: { id: currParentId },
          select: { parentId: true }
        });
        currParentId = parentNode?.parentId ?? null;
      }
    }

    const duplicate = await prisma.folder.findFirst({
      where: {
        id: { not: folderId },
        parentId: finalParentId,
        name: finalName
      }
    });

    if (duplicate) {
      throw new AppError(409, "FOLDER_NAME_CONFLICT", "A folder with this name already exists in this location");
    }

    try {
      const updated = await prisma.folder.update({
        where: { id: folderId },
        data: {
          name: finalName,
          parentId: finalParentId
        }
      });

      return toSafeFolder(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(409, "FOLDER_NAME_CONFLICT", "A folder with this name already exists in this location");
      }
      throw error;
    }
  }

  static async deleteFolder(folderId: string): Promise<void> {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId }
    });

    if (!folder) {
      throw new AppError(404, "FOLDER_NOT_FOUND", "Folder not found");
    }

    const allFolderIds: string[] = [folderId];
    let currentLevel: string[] = [folderId];

    while (currentLevel.length > 0) {
      const children = await prisma.folder.findMany({
        where: { parentId: { in: currentLevel } },
        select: { id: true }
      });
      currentLevel = children.map((c) => c.id);
      if (currentLevel.length > 0) {
        allFolderIds.push(...currentLevel);
      }
    }

    const filesInTree = await prisma.file.findMany({
      where: { folderId: { in: allFolderIds } },
      select: { storageKey: true }
    });

    const storageKeys = filesInTree.map((f) => f.storageKey);

    // Delete all R2 objects for files in the subtree first
    try {
      await StorageService.deleteObjects(storageKeys);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(502, "STORAGE_ERROR", "Failed to delete storage objects");
    }

    // Cascade delete target folder and descendant folders/files in DB only after R2 deletion succeeds
    await prisma.folder.delete({
      where: { id: folderId }
    });
  }
}
