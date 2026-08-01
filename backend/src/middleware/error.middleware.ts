import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../types/api.js";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";

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
  err: Error | AppError | (Error & { status?: number; statusCode?: number; type?: string }),
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // If error is an explicit AppError, handle it with its specified statusCode and code
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details })
      }
    };
    res.status(err.statusCode).json(response);
    return;
  }

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

  // Handle express.json() body size limit exceeded (limit: "1mb")
  if ((err as { type?: string }).type === "entity.too.large") {
    const response: ApiResponse = {
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "JSON payload exceeds maximum size limit of 1 MB"
      }
    };
    res.status(413).json(response);
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
    typeof (err as unknown as { statusCode?: number }).statusCode === "number"
      ? (err as unknown as { statusCode: number }).statusCode
      : typeof (err as unknown as { status?: number }).status === "number"
      ? (err as unknown as { status: number }).status
      : 500;

  // In production, mask unexpected internal non-AppError messages to prevent info disclosure
  const message =
    env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : err.message || "An unexpected error occurred";

  const response: ApiResponse = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message
    }
  };

  res.status(statusCode).json(response);
};
