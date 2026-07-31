import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import dotenv from "dotenv";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

dotenv.config();

const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@bgain.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "adminpassword";
const viewerEmail = process.env.SEED_VIEWER_EMAIL || "viewer@bgain.com";
const viewerPassword = process.env.SEED_VIEWER_PASSWORD || "viewerpassword";

describe("User Management Tests (Phase 4)", () => {
  let adminToken: string;
  let viewerToken: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // Obtain tokens for seeded Admin and Viewer
    const adminLoginRes = await request(app).post("/api/auth/login").send({
      email: adminEmail,
      password: adminPassword
    });
    adminToken = adminLoginRes.body.data.accessToken;

    const viewerLoginRes = await request(app).post("/api/auth/login").send({
      email: viewerEmail,
      password: viewerPassword
    });
    viewerToken = viewerLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Safely delete only user accounts created during test execution
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } }
      });
    }
  });

  it("1. Admin can list users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.users.length).toBeGreaterThanOrEqual(2);
  });

  it("2. User list is ordered by createdAt descending", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);

    const users = res.body.data.users;
    for (let i = 0; i < users.length - 1; i++) {
      const timeA = new Date(users[i].createdAt).getTime();
      const timeB = new Date(users[i + 1].createdAt).getTime();
      expect(timeA).toBeGreaterThanOrEqual(timeB);
    }
  });

  it("3. User list never contains passwordHash", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);

    const users = res.body.data.users;
    for (const u of users) {
      expect(u.passwordHash).toBeUndefined();
    }
  });

  it("4. Viewer cannot list users (403)", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action"
      }
    });
  });

  it("5. Unauthenticated user cannot list users (401)", async () => {
    const res = await request(app).get("/api/users");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required"
      }
    });
  });

  it("6. Admin can create a Viewer (201)", async () => {
    const testEmail = `test-user-v-${crypto.randomUUID()}@example.com`;
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Test Viewer",
        email: testEmail,
        password: "TestPassword123!",
        role: "VIEWER"
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      name: "Test Viewer",
      email: testEmail.toLowerCase(),
      role: "VIEWER",
      createdAt: expect.any(String)
    });

    createdUserIds.push(res.body.data.user.id);
  });

  it("7. Admin can create an Admin (201)", async () => {
    const testEmail = `test-user-a-${crypto.randomUUID()}@example.com`;
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Test Admin",
        email: testEmail,
        password: "TestPassword123!",
        role: "ADMIN"
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("ADMIN");

    createdUserIds.push(res.body.data.user.id);
  });

  it("8. Created user name is trimmed", async () => {
    const testEmail = `test-user-trim-${crypto.randomUUID()}@example.com`;
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "   Padded Name   ",
        email: testEmail,
        password: "TestPassword123!",
        role: "VIEWER"
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.name).toBe("Padded Name");

    createdUserIds.push(res.body.data.user.id);
  });

  it("9. Created email is normalized to lowercase", async () => {
    const testEmailUpper = `TEST-USER-LOWER-${crypto.randomUUID()}@EXAMPLE.COM`;
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Lower Email Test",
        email: `  ${testEmailUpper}  `,
        password: "TestPassword123!",
        role: "VIEWER"
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(testEmailUpper.toLowerCase().trim());

    createdUserIds.push(res.body.data.user.id);
  });

  it("10. Stored password is hashed and not equal to submitted password", async () => {
    const rawPassword = "TestPassword123!";
    const testEmail = `test-user-hash-${crypto.randomUUID()}@example.com`;
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Hash Check User",
        email: testEmail,
        password: rawPassword,
        role: "VIEWER"
      });

    const newUserId = res.body.data.user.id;
    createdUserIds.push(newUserId);

    const userInDb = await prisma.user.findUnique({ where: { id: newUserId } });
    expect(userInDb).toBeDefined();
    expect(userInDb?.passwordHash).not.toBe(rawPassword);
  });

  it("11. Created password hash uses bcrypt cost factor 12", async () => {
    const rawPassword = "TestPassword123!";
    const testEmail = `test-user-cost12-${crypto.randomUUID()}@example.com`;
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Cost Factor User",
        email: testEmail,
        password: rawPassword,
        role: "VIEWER"
      });

    const newUserId = res.body.data.user.id;
    createdUserIds.push(newUserId);

    const userInDb = await prisma.user.findUnique({ where: { id: newUserId } });
    expect(userInDb).toBeDefined();
    expect(userInDb?.passwordHash).toMatch(/^\$2[ab]\$12\$/);
  });

  it("12. Duplicate email returns 409 EMAIL_ALREADY_EXISTS", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Duplicate User Attempt",
        email: adminEmail,
        password: "TestPassword123!",
        role: "VIEWER"
      });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "A user with this email already exists"
      }
    });
  });

  it("13. Viewer cannot create a user (403)", async () => {
    const testEmail = `test-user-no-viewer-${crypto.randomUUID()}@example.com`;
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        name: "Viewer Attempt User",
        email: testEmail,
        password: "TestPassword123!",
        role: "VIEWER"
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("14. Unauthenticated user cannot create a user (401)", async () => {
    const testEmail = `test-user-no-auth-${crypto.randomUUID()}@example.com`;
    const res = await request(app)
      .post("/api/users")
      .send({
        name: "No Auth User",
        email: testEmail,
        password: "TestPassword123!",
        role: "VIEWER"
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("15. Invalid name (too short/empty) returns 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "a",
        email: `invalid-name-${crypto.randomUUID()}@example.com`,
        password: "TestPassword123!",
        role: "VIEWER"
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("16. Invalid email returns 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Invalid Email User",
        email: "not-a-valid-email",
        password: "TestPassword123!",
        role: "VIEWER"
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("17. Password shorter than 8 characters returns 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Short Pass User",
        email: `short-pass-${crypto.randomUUID()}@example.com`,
        password: "short",
        role: "VIEWER"
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("18. Password longer than 72 characters returns 400 VALIDATION_ERROR", async () => {
    const longPassword = "a".repeat(73);
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Long Pass User",
        email: `long-pass-${crypto.randomUUID()}@example.com`,
        password: longPassword,
        role: "VIEWER"
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("19. Invalid role returns 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Invalid Role User",
        email: `invalid-role-${crypto.randomUUID()}@example.com`,
        password: "TestPassword123!",
        role: "SUPERADMIN"
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("20. Create user response never contains passwordHash", async () => {
    const testEmail = `test-user-nohash-${crypto.randomUUID()}@example.com`;
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "No Hash User",
        email: testEmail,
        password: "TestPassword123!",
        role: "VIEWER"
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.passwordHash).toBeUndefined();

    createdUserIds.push(res.body.data.user.id);
  });
});
