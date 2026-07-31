import rateLimit from "express-rate-limit";
import { ApiResponse } from "../types/api.js";
import { env } from "../config/env.js";

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const response: ApiResponse = {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests, please try again later."
      }
    };
    res.status(429).json(response);
  }
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test", // Skip automatically during tests to prevent test flakiness
  handler: (_req, res) => {
    const response: ApiResponse = {
      success: false,
      error: {
        code: "LOGIN_RATE_LIMIT_EXCEEDED",
        message: "Too many login attempts. Please try again later."
      }
    };
    res.status(429).json(response);
  }
});
