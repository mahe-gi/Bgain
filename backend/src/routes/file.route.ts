import { Router } from "express";
import { FileController } from "../controllers/file.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { handleFileUpload } from "../middleware/upload.middleware.js";
import {
  validateQuery,
  validateParams,
  validateBody
} from "../middleware/validate.middleware.js";
import {
  fileQuerySchema,
  fileIdParamSchema,
  updateFileSchema
} from "../schemas/file.schema.js";

export const fileRouter = Router();

// Upload file (Admin only)
// Note: Middleware order: authenticate -> requireAdmin -> Multer single file -> controller
fileRouter.post(
  "/",
  authenticate,
  requireAdmin,
  handleFileUpload,
  FileController.uploadFile
);

// List files (Admin and Viewer)
fileRouter.get(
  "/",
  authenticate,
  validateQuery(fileQuerySchema),
  FileController.listFiles
);

// Get file metadata by ID (Admin and Viewer)
fileRouter.get(
  "/:id",
  authenticate,
  validateParams(fileIdParamSchema),
  FileController.getFileById
);

// Rename/move file (Admin only)
fileRouter.patch(
  "/:id",
  authenticate,
  requireAdmin,
  validateParams(fileIdParamSchema),
  validateBody(updateFileSchema),
  FileController.updateFile
);

// Delete file (Admin only)
fileRouter.delete(
  "/:id",
  authenticate,
  requireAdmin,
  validateParams(fileIdParamSchema),
  FileController.deleteFile
);

// Get short-lived preview URL (Admin and Viewer)
fileRouter.get(
  "/:id/preview-url",
  authenticate,
  validateParams(fileIdParamSchema),
  FileController.getPreviewUrl
);

// Get short-lived download URL (Admin and Viewer)
fileRouter.get(
  "/:id/download-url",
  authenticate,
  validateParams(fileIdParamSchema),
  FileController.getDownloadUrl
);
