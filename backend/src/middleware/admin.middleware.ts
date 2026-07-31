import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";

export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== "ADMIN") {
    next(new AppError(403, "FORBIDDEN", "You do not have permission to perform this action"));
    return;
  }
  next();
};
