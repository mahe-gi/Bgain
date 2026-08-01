import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";
import { globalRateLimiter } from "./middleware/rate-limit.middleware.js";

export const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS middleware configured with CORS_ORIGINS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or Postman)
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("CORS policy violation"));
        }
      },
      credentials: true
    })
  );

  // Logging middleware with sensitive header & body redaction (disabled during tests)
  if (env.NODE_ENV !== "test") {
    app.use(
      pinoHttp({
        redact: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.password",
          "req.body.passwordHash",
          "req.body.secret"
        ]
      })
    );
  }

  // Body parsing middleware with 1 MB size limit
  app.use(express.json({ limit: "1mb" }));

  // Rate limiting middleware
  app.use("/api", globalRateLimiter);

  // API Routes
  app.use("/api", apiRouter);

  // 404 handler for unmatched routes
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
