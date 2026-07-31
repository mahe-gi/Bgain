import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/app-error.js";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      next(new AppError(400, "VALIDATION_ERROR", message));
      return;
    }
    req.body = result.data;
    next();
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      next(new AppError(400, "VALIDATION_ERROR", message));
      return;
    }
    Object.assign(req.query, result.data);
    next();
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      next(new AppError(400, "VALIDATION_ERROR", message));
      return;
    }
    Object.assign(req.params, result.data);
    next();
  };
};
