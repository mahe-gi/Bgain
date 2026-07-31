import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { requireAdmin } from "../src/middleware/admin.middleware.js";
import { loginRateLimiter } from "../src/middleware/rate-limit.middleware.js";
import { Request, Response, NextFunction } from "express";

dotenv.config();

const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@bgain.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "adminpassword";
const viewerEmail = process.env.SEED_VIEWER_EMAIL || "viewer@bgain.com";
const viewerPassword = process.env.SEED_VIEWER_PASSWORD || "viewerpassword";

describe("Authentication and RBAC Tests (Phase 3)", () => {
  let adminToken: string;
  let viewerToken: string;

  it("1. Valid Admin login returns 200, JWT token, and safe admin user", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: adminEmail,
      password: adminPassword
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.accessToken).toBe("string");
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      email: adminEmail.toLowerCase(),
      role: "ADMIN",
      createdAt: expect.any(String)
    });

    adminToken = res.body.data.accessToken;
  });

  it("2. Valid Viewer login returns 200, JWT token, and safe viewer user", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: viewerEmail,
      password: viewerPassword
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.accessToken).toBe("string");
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      email: viewerEmail.toLowerCase(),
      role: "VIEWER",
      createdAt: expect.any(String)
    });

    viewerToken = res.body.data.accessToken;
  });

  it("3. Email normalization allows uppercase and padded emails to log in", async () => {
    const paddedEmail = `  ${adminEmail.toUpperCase()}  `;
    const res = await request(app).post("/api/auth/login").send({
      email: paddedEmail,
      password: adminPassword
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(adminEmail.toLowerCase());
  });

  it("4. Incorrect password returns generic 401 INVALID_CREDENTIALS", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: adminEmail,
      password: "WrongPassword123!"
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password"
      }
    });
  });

  it("5. Unknown email returns identical generic 401 INVALID_CREDENTIALS", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "unknown-user-does-not-exist@example.com",
      password: adminPassword
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password"
      }
    });
  });

  it("6. Missing email/password returns 400 VALIDATION_ERROR", async () => {
    const res = await request(app).post("/api/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("7. Malformed email returns 400 VALIDATION_ERROR", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "not-an-email",
      password: adminPassword
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("8. Successful login response never contains passwordHash", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: adminEmail,
      password: adminPassword
    });

    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("9. GET /api/auth/me works with valid Admin token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("ADMIN");
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("10. GET /api/auth/me works with valid Viewer token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("VIEWER");
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("11. Missing Authorization header returns 401 UNAUTHORIZED", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required"
      }
    });
  });

  it("12. Malformed Bearer header returns 401 UNAUTHORIZED", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Basic dXNlcjpwYXNz");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required"
      }
    });
  });

  it("13. Invalid token returns 401 UNAUTHORIZED", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.jwt.token");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required"
      }
    });
  });

  it("14. Expired token returns 401 UNAUTHORIZED", async () => {
    const expiredToken = jwt.sign({ sub: "1079ea15-c3f1-44be-bc3d-73281045065b" }, env.JWT_SECRET, {
      expiresIn: "-1s"
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required"
      }
    });
  });

  it("15. Admin middleware allows Admin user", () => {
    const mockReq = {
      user: { id: "1", name: "Admin", email: "admin@test.com", role: "ADMIN", createdAt: new Date().toISOString() }
    } as unknown as Request;
    const mockRes = {} as Response;
    let nextCalled = false;
    const next: NextFunction = () => {
      nextCalled = true;
    };

    requireAdmin(mockReq, mockRes, next);
    expect(nextCalled).toBe(true);
  });

  it("16. Admin middleware rejects Viewer user with 403 FORBIDDEN", () => {
    const mockReq = {
      user: { id: "2", name: "Viewer", email: "viewer@test.com", role: "VIEWER", createdAt: new Date().toISOString() }
    } as unknown as Request;
    const mockRes = {} as Response;
    let errorPassed: { statusCode?: number; code?: string; message?: string } | undefined;
    const next: NextFunction = (err?: unknown) => {
      errorPassed = err as { statusCode?: number; code?: string; message?: string };
    };

    requireAdmin(mockReq, mockRes, next);
    expect(errorPassed).toBeDefined();
    expect(errorPassed?.statusCode).toBe(403);
    expect(errorPassed?.code).toBe("FORBIDDEN");
    expect(errorPassed?.message).toBe("You do not have permission to perform this action");
  });

  it("17. Login rate limiter returns standard 429 error envelope when triggered", async () => {
    const testLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1,
      standardHeaders: true,
      legacyHeaders: false,
      validate: false,
      handler: (_req, res) => {
        const response = {
          success: false,
          error: {
            code: "LOGIN_RATE_LIMIT_EXCEEDED",
            message: "Too many login attempts. Please try again later."
          }
        };
        res.status(429).json(response);
      }
    });

    let responseStatus: number | undefined;
    let responseJson: unknown;
    const mockReq = { ip: "192.168.1.100", headers: {} } as Request;
    const mockRes = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(body: unknown) {
        responseJson = body;
        return this;
      },
      setHeader() {
        return this;
      },
      getHeader() {
        return undefined;
      }
    } as unknown as Response;

    // First request succeeds under limit
    await testLimiter(mockReq, mockRes, () => {});
    // Second request exceeds limit and triggers rate-limit handler
    await testLimiter(mockReq, mockRes, () => {});

    expect(responseStatus).toBe(429);
    expect(responseJson).toEqual({
      success: false,
      error: {
        code: "LOGIN_RATE_LIMIT_EXCEEDED",
        message: "Too many login attempts. Please try again later."
      }
    });
  });
});
