import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024
  }
}).single("file");

export const handleFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          next(new AppError(413, "FILE_TOO_LARGE", `File size exceeds maximum allowed limit of ${env.MAX_FILE_SIZE_MB} MB`));
          return;
        }
        next(new AppError(400, "VALIDATION_ERROR", "Unexpected upload field or multiple files provided"));
        return;
      }
      next(err);
      return;
    }
    next();
  });
};
