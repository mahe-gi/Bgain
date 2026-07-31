import crypto from "node:crypto";
import { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/app-error.js";
import { StorageService } from "./storage.service.js";
import {
  FileQueryInput,
  UploadBodyInput,
  UpdateFileInput,
  validateFilenameAndMime,
  PREVIEWABLE_MIME_TYPES
} from "../schemas/file.schema.js";
import { env } from "../config/env.js";

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

export const toSafeFile = (file: {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string | null;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}): SafeFile => ({
  id: file.id,
  name: file.name,
  mimeType: file.mimeType,
  sizeBytes: file.sizeBytes,
  folderId: file.folderId,
  uploadedById: file.uploadedById,
  createdAt: file.createdAt.toISOString(),
  updatedAt: file.updatedAt.toISOString()
});

export class FileService {
  static async uploadFile(
    file: Express.Multer.File | undefined,
    body: UploadBodyInput,
    userId: string
  ): Promise<SafeFile> {
    if (!file) {
      throw new AppError(400, "FILE_REQUIRED", "A file is required for upload");
    }

    let safeName: string;
    try {
      const validated = validateFilenameAndMime(file.originalname, file.mimetype);
      safeName = validated.safeName;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "File validation failed";
      throw new AppError(415, "FILE_TYPE_NOT_ALLOWED", message);
    }

    const targetFolderId = body.folderId ?? null;

    if (targetFolderId !== null) {
      const folderExists = await prisma.folder.findUnique({
        where: { id: targetFolderId }
      });
      if (!folderExists) {
        throw new AppError(404, "FOLDER_NOT_FOUND", "Target folder not found");
      }
    }

    const existing = await prisma.file.findFirst({
      where: {
        folderId: targetFolderId,
        name: safeName
      }
    });

    if (existing) {
      throw new AppError(409, "FILE_NAME_CONFLICT", "A file with this name already exists in this location");
    }

    const storageKey = `files/${crypto.randomUUID()}`;

    // 1. Upload bytes to R2
    try {
      await StorageService.uploadObject(storageKey, file.buffer, file.mimetype);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(502, "STORAGE_ERROR", "Failed to upload file to storage");
    }

    // 2. Insert metadata into PostgreSQL with R2 deletion compensation if DB fails
    try {
      const createdFile = await prisma.file.create({
        data: {
          name: safeName,
          storageKey,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          folderId: targetFolderId,
          uploadedById: userId
        }
      });

      return toSafeFile(createdFile);
    } catch (err) {
      // Compensating R2 object deletion
      await StorageService.deleteObject(storageKey).catch(() => {});

      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new AppError(409, "FILE_NAME_CONFLICT", "A file with this name already exists in this location");
      }
      throw err;
    }
  }

  static async listFiles(query: FileQueryInput): Promise<SafeFile[]> {
    let targetFolderId: string | null = null;

    if (query.folderId !== "root") {
      const folderExists = await prisma.folder.findUnique({
        where: { id: query.folderId }
      });
      if (!folderExists) {
        throw new AppError(404, "FOLDER_NOT_FOUND", "Folder not found");
      }
      targetFolderId = query.folderId;
    }

    const files = await prisma.file.findMany({
      where: { folderId: targetFolderId },
      orderBy: { [query.sortBy]: query.order }
    });

    return files.map(toSafeFile);
  }

  static async getFileById(fileId: string): Promise<SafeFile> {
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      throw new AppError(404, "FILE_NOT_FOUND", "File not found");
    }

    return toSafeFile(file);
  }

  static async updateFile(
    fileId: string,
    input: UpdateFileInput
  ): Promise<SafeFile> {
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      throw new AppError(404, "FILE_NOT_FOUND", "File not found");
    }

    let finalName = file.name;
    if (input.name !== undefined) {
      try {
        const validated = validateFilenameAndMime(input.name, file.mimeType);
        finalName = validated.safeName;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Filename validation failed";
        throw new AppError(415, "FILE_TYPE_NOT_ALLOWED", message);
      }
    }

    let finalFolderId = file.folderId;
    if (input.folderId !== undefined) {
      finalFolderId = input.folderId;
      if (finalFolderId !== null) {
        const folderExists = await prisma.folder.findUnique({
          where: { id: finalFolderId }
        });
        if (!folderExists) {
          throw new AppError(404, "FOLDER_NOT_FOUND", "Target folder not found");
        }
      }
    }

    if (finalName !== file.name || finalFolderId !== file.folderId) {
      const existing = await prisma.file.findFirst({
        where: {
          folderId: finalFolderId,
          name: finalName,
          id: { not: fileId }
        }
      });

      if (existing) {
        throw new AppError(409, "FILE_NAME_CONFLICT", "A file with this name already exists in this location");
      }
    }

    try {
      const updatedFile = await prisma.file.update({
        where: { id: fileId },
        data: {
          name: finalName,
          folderId: finalFolderId
        }
      });

      return toSafeFile(updatedFile);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new AppError(409, "FILE_NAME_CONFLICT", "A file with this name already exists in this location");
      }
      throw err;
    }
  }

  static async deleteFile(fileId: string): Promise<void> {
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      throw new AppError(404, "FILE_NOT_FOUND", "File not found");
    }

    // 1. Delete R2 object first
    try {
      await StorageService.deleteObject(file.storageKey);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(502, "STORAGE_ERROR", "Failed to delete storage object");
    }

    // 2. Delete database metadata only after R2 deletion succeeds
    await prisma.file.delete({
      where: { id: fileId }
    });
  }

  static async getPreviewUrl(
    fileId: string
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      throw new AppError(404, "FILE_NOT_FOUND", "File not found");
    }

    if (!PREVIEWABLE_MIME_TYPES.has(file.mimeType)) {
      throw new AppError(415, "PREVIEW_NOT_SUPPORTED", "Preview is not supported for this file type");
    }

    const url = await StorageService.getPreviewUrl(file.storageKey, file.mimeType);
    return {
      url,
      expiresInSeconds: env.SIGNED_URL_TTL_SECONDS
    };
  }

  static async getDownloadUrl(
    fileId: string
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      throw new AppError(404, "FILE_NOT_FOUND", "File not found");
    }

    const url = await StorageService.getDownloadUrl(file.storageKey, file.name);
    return {
      url,
      expiresInSeconds: env.SIGNED_URL_TTL_SECONDS
    };
  }
}
