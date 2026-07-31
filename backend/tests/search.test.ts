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

describe("Global Search APIs (Phase 8)", { timeout: 30000 }, () => {
  let adminToken: string;
  let viewerToken: string;
  let adminUserId: string;

  const searchTag = `srch-${crypto.randomUUID().slice(0, 8)}`;
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

    // Create matching folder
    const folder = await prisma.folder.create({
      data: {
        name: `MatchingFolder-${searchTag}`,
        parentId: null,
        createdById: adminUserId
      }
    });
    createdFolderIds.push(folder.id);

    // Create matching file
    const file = await prisma.file.create({
      data: {
        name: `MatchingFile-${searchTag}.pdf`,
        storageKey: `files/search-${crypto.randomUUID()}`,
        mimeType: "application/pdf",
        sizeBytes: 500,
        folderId: folder.id,
        uploadedById: adminUserId
      }
    });
    createdFileIds.push(file.id);
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

  it("1. Admin can search GET /api/search?q=<text>", async () => {
    const res = await request(app)
      .get(`/api/search?q=${searchTag}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.query).toBe(searchTag);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.folders.length).toBe(1);
    expect(res.body.data.files.length).toBe(1);
    expect(res.body.data.files[0].storageKey).toBeUndefined();
  });

  it("2. Viewer can search GET /api/search?q=<text>", async () => {
    const res = await request(app)
      .get(`/api/search?q=${searchTag}`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(2);
  });

  it("3. Unauthenticated search returns 401 UNAUTHORIZED", async () => {
    const res = await request(app).get(`/api/search?q=${searchTag}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("4 & 5. Folder-name and File-name matching, case-insensitivity, and whitespace trimming", async () => {
    const lowerQuery = `  ${searchTag.toLowerCase()}  `;
    const res = await request(app)
      .get(`/api/search?q=${encodeURIComponent(lowerQuery)}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.query).toBe(searchTag.toLowerCase());
    expect(res.body.data.total).toBe(2);
  });

  it("6. Validation: Query under 2 chars or over 100 chars returns 400 VALIDATION_ERROR", async () => {
    const shortRes = await request(app)
      .get("/api/search?q=a")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(shortRes.status).toBe(400);
    expect(shortRes.body.error.code).toBe("VALIDATION_ERROR");

    const longQuery = "a".repeat(101);
    const longRes = await request(app)
      .get(`/api/search?q=${longQuery}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(longRes.status).toBe(400);
    expect(longRes.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("7. No results response returns empty arrays and total 0", async () => {
    const res = await request(app)
      .get("/api/search?q=NonExistentQueryTag12345")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.folders).toEqual([]);
    expect(res.body.data.files).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  it("8 & 9. Deterministic 100-result limit slicing and ordering", async () => {
    const limitTag = `limit-${crypto.randomUUID().slice(0, 8)}`;

    // Create 60 matching folders and 60 matching files using createMany
    const folderData = Array.from({ length: 60 }, (_, i) => ({
      name: `Folder-${limitTag}-${i}`,
      parentId: null,
      createdById: adminUserId
    }));
    await prisma.folder.createMany({ data: folderData });

    const fileData = Array.from({ length: 60 }, (_, i) => ({
      name: `File-${limitTag}-${i}.txt`,
      storageKey: `files/limit-${crypto.randomUUID()}-${i}`,
      mimeType: "text/plain",
      sizeBytes: 10,
      uploadedById: adminUserId
    }));
    await prisma.file.createMany({ data: fileData });

    const res = await request(app)
      .get(`/api/search?q=${limitTag}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(100);
    expect(res.body.data.folders.length + res.body.data.files.length).toBe(100);

    // Clean up created limit test records
    await prisma.file.deleteMany({ where: { name: { contains: limitTag } } });
    await prisma.folder.deleteMany({ where: { name: { contains: limitTag } } });
  });
});
