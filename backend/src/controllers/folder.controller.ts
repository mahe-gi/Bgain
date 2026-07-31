import { Request, Response, NextFunction } from "express";
import { FolderService } from "../services/folder.service.js";
import { ApiResponse } from "../types/api.js";
import { SafeFolder } from "../services/folder.service.js";
import { FolderQueryInput } from "../schemas/folder.schema.js";
import { AppError } from "../utils/app-error.js";

export class FolderController {
  static async listFolders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const folders = await FolderService.listFolders(
        req.query as unknown as FolderQueryInput
      );
      const response: ApiResponse<{ folders: SafeFolder[] }> = {
        success: true,
        data: { folders }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async createFolder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, "UNAUTHORIZED", "Authentication required");
      }
      const folder = await FolderService.createFolder(req.body, req.user.id);
      const response: ApiResponse<{ folder: SafeFolder }> = {
        success: true,
        data: { folder }
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async updateFolder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const folderId = req.params.id as string;
      const folder = await FolderService.updateFolder(folderId, req.body);
      const response: ApiResponse<{ folder: SafeFolder }> = {
        success: true,
        data: { folder }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async deleteFolder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const folderId = req.params.id as string;
      await FolderService.deleteFolder(folderId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
}
