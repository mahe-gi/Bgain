import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types/api.js";
import { AppError } from "../utils/app-error.js";

export const notFoundHandler = (_req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route not found"
    }
  };
  res.status(404).json(response);
};

export const errorHandler = (
  err: Error | AppError | (Error & { status?: number; statusCode?: number }),
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle SyntaxError from express.json() for malformed JSON body
  if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: "MALFORMED_JSON",
        message: "Invalid JSON payload in request body"
      }
    };
    res.status(400).json(response);
    return;
  }

  // Handle CORS policy violation
  if (err.message === "CORS policy violation") {
    const response: ApiResponse = {
      success: false,
      error: {
        code: "CORS_NOT_ALLOWED",
        message: "CORS policy violation: origin not allowed"
      }
    };
    res.status(403).json(response);
    return;
  }

  const statusCode =
    err instanceof AppError
      ? err.statusCode
      : typeof (err as { status?: number; statusCode?: number }).statusCode === "number"
      ? (err as { statusCode: number }).statusCode
      : typeof (err as { status?: number }).status === "number"
      ? (err as { status: number }).status
      : 500;

  const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
  const message = err.message || "An unexpected error occurred";
  const details = err instanceof AppError ? err.details : undefined;

  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    }
  };

  res.status(statusCode).json(response);
};
