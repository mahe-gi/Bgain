import { Request, Response, NextFunction } from "express";
import { FileService, SafeFile } from "../services/file.service.js";
import { ApiResponse } from "../types/api.js";
import { FileQueryInput, uploadBodySchema } from "../schemas/file.schema.js";
import { AppError } from "../utils/app-error.js";

export class FileController {
  static async uploadFile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, "UNAUTHORIZED", "Authentication required");
      }
      if (!req.file) {
        throw new AppError(400, "FILE_REQUIRED", "A file is required for upload");
      }
      const parsedBodyResult = uploadBodySchema.safeParse(req.body || {});
      if (!parsedBodyResult.success) {
        const message = parsedBodyResult.error.errors.map((e) => e.message).join(", ");
        throw new AppError(400, "VALIDATION_ERROR", message);
      }

      const file = await FileService.uploadFile(
        req.file,
        parsedBodyResult.data,
        req.user.id
      );

      const response: ApiResponse<{ file: SafeFile }> = {
        success: true,
        data: { file }
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async listFiles(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const files = await FileService.listFiles(
        req.query as unknown as FileQueryInput
      );
      const response: ApiResponse<{ files: SafeFile[] }> = {
        success: true,
        data: { files }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getFileById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const fileId = req.params.id as string;
      const file = await FileService.getFileById(fileId);
      const response: ApiResponse<{ file: SafeFile }> = {
        success: true,
        data: { file }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getPreviewUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const fileId = req.params.id as string;
      const data = await FileService.getPreviewUrl(fileId);
      const response: ApiResponse<{ url: string; expiresInSeconds: number }> = {
        success: true,
        data
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getDownloadUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const fileId = req.params.id as string;
      const data = await FileService.getDownloadUrl(fileId);
      const response: ApiResponse<{ url: string; expiresInSeconds: number }> = {
        success: true,
        data
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
