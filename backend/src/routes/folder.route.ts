import { Router } from "express";
import { FolderController } from "../controllers/folder.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams
} from "../middleware/validate.middleware.js";
import {
  folderQuerySchema,
  createFolderSchema,
  updateFolderSchema,
  folderIdParamSchema
} from "../schemas/folder.schema.js";

export const folderRouter = Router();

// List folders (Admin and Viewer allowed)
folderRouter.get(
  "/",
  authenticate,
  validateQuery(folderQuerySchema),
  FolderController.listFolders
);

// Admin-only write operations
folderRouter.post(
  "/",
  authenticate,
  requireAdmin,
  validateBody(createFolderSchema),
  FolderController.createFolder
);

folderRouter.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validateParams(folderIdParamSchema),
  validateBody(updateFolderSchema),
  FolderController.updateFolder
);

folderRouter.delete(
  "/:id",
  authenticate,
  requireAdmin,
  validateParams(folderIdParamSchema),
  FolderController.deleteFolder
);
