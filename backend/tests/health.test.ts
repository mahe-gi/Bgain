import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("Backend Foundation Tests", () => {
  it("GET /api/health returns 200 with standard success envelope", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        status: "ok",
        timestamp: expect.any(String)
      }
    });
    // Verify ISO-8601 timestamp validity
    expect(new Date(res.body.data.timestamp).getTime()).not.toBeNaN();
  });

  it("GET /api/unknown returns 404 with standard error envelope", async () => {
    const res = await request(app).get("/api/unknown");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found"
      }
    });
  });

  it("POST with malformed JSON returns 400 with standard error envelope", async () => {
    const res = await request(app)
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{ invalid-json-payload ");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "MALFORMED_JSON",
        message: "Invalid JSON payload in request body"
      }
    });
  });

  it("CORS allows permitted origins in CORS_ORIGINS", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:5173");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("CORS rejects unauthorized origin with 403 standard error envelope", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("Origin", "http://unauthorized-domain.com");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "CORS_NOT_ALLOWED",
        message: "CORS policy violation: origin not allowed"
      }
    });
  });

  it("CORS allows requests without Origin header (curl / mobile apps)", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
