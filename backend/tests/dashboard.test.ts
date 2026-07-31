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

describe("Dashboard APIs (Phase 8)", { timeout: 30000 }, () => {
  let adminToken: string;
  let viewerToken: string;
  let adminUserId: string;

  const createdFolderIds: string[] = [];
  const createdFileIds: string[] = [];

  beforeAll(async () => {
    const adminLoginRes = await request(app).post("/api/auth/login").send({
      email: adminEmail,
      password: adminPassword
    });
    adminToken = adminLoginRes.body.data.accessToken;
    adminUserId = adminLoginRes.body.data.user.id;

    const viewerLoginRes = await request(app).post("/api/auth/login").send({
      email: viewerEmail,
      password: viewerPassword
    });
    viewerToken = viewerLoginRes.body.data.accessToken;

    // Create test folder
    const folder = await prisma.folder.create({
      data: {
        name: `dash-test-folder-${crypto.randomUUID()}`,
        parentId: null,
        createdById: adminUserId
      }
    });
    createdFolderIds.push(folder.id);

    // Create 6 test files to test max 5 recent files
    for (let i = 1; i <= 6; i++) {
      const file = await prisma.file.create({
        data: {
          name: `dash-test-file-${i}-${crypto.randomUUID()}.txt`,
          storageKey: `files/dash-${crypto.randomUUID()}`,
          mimeType: "text/plain",
          sizeBytes: 100 * i,
          folderId: folder.id,
          uploadedById: adminUserId,
          createdAt: new Date(Date.now() + i * 1000) // Distinct increasing timestamps
        }
      });
      createdFileIds.push(file.id);
    }
  });

  afterAll(async () => {
    if (createdFileIds.length > 0) {
      await prisma.file.deleteMany({
        where: { id: { in: createdFileIds } }
      });
    }
    if (createdFolderIds.length > 0) {
      await prisma.folder.deleteMany({
        where: { id: { in: createdFolderIds } }
      });
    }
  });

  it("1. Admin can access GET /api/dashboard", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.folderCount).toBe("number");
    expect(typeof res.body.data.fileCount).toBe("number");
    expect(typeof res.body.data.totalSizeBytes).toBe("number");
    expect(Array.isArray(res.body.data.recentFiles)).toBe(true);
  });

  it("2. Viewer can access GET /api/dashboard", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("3. Unauthenticated request returns 401 UNAUTHORIZED", async () => {
    const res = await request(app).get("/api/dashboard");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("4, 5, 6 & 10. Dashboard counts, total size, recentFiles limit (<=5), and absence of storageKey & totalUsers", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data.folderCount).toBeGreaterThanOrEqual(1);
    expect(data.fileCount).toBeGreaterThanOrEqual(6);
    expect(data.totalSizeBytes).toBeGreaterThanOrEqual(2100);

    // Exclusions
    expect(data.totalUsers).toBeUndefined();
    expect(data.storageKey).toBeUndefined();

    // recentFiles limit
    expect(data.recentFiles.length).toBeLessThanOrEqual(5);

    // Verify recentFiles shape and ordering (newest first)
    for (let i = 0; i < data.recentFiles.length; i++) {
      const f = data.recentFiles[i];
      expect(f.storageKey).toBeUndefined();
      if (i > 0) {
        const prevTime = new Date(data.recentFiles[i - 1].createdAt).getTime();
        const currTime = new Date(f.createdAt).getTime();
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    }
  });
});
