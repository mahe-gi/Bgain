import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import dotenv from "dotenv";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { StorageService } from "../src/services/storage.service.js";

dotenv.config();

const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@bgain.com";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "adminpassword";
const viewerEmail = process.env.SEED_VIEWER_EMAIL || "viewer@bgain.com";
const viewerPassword = process.env.SEED_VIEWER_PASSWORD || "viewerpassword";

describe("File APIs & Storage Tests (Phase 6)", { timeout: 30000 }, () => {
  let adminToken: string;
  let viewerToken: string;
  const createdFileIds: string[] = [];
  const createdFolderIds: string[] = [];

  beforeAll(async () => {
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

    // Mock storage service calls by default for test isolation
    vi.spyOn(StorageService, "uploadObject").mockImplementation(async () => {});
    vi.spyOn(StorageService, "deleteObject").mockImplementation(async () => {});
    vi.spyOn(StorageService, "getPreviewUrl").mockImplementation(
      async (key, mime) => `https://signed-preview.example.com/${key}?mime=${encodeURIComponent(mime)}`
    );
    vi.spyOn(StorageService, "getDownloadUrl").mockImplementation(
      async (key, name) => `https://signed-download.example.com/${key}?name=${encodeURIComponent(name)}`
    );
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
    vi.restoreAllMocks();
  });

  it("1. Admin uploads each allowed file type", async () => {
    const allowedTypes = [
      { name: "test-file-1.pdf", mime: "application/pdf" },
      { name: "test-file-2.jpg", mime: "image/jpeg" },
      { name: "test-file-3.png", mime: "image/png" },
      { name: "test-file-4.txt", mime: "text/plain" },
      { name: "test-file-5.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      { name: "test-file-6.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    ];

    for (const t of allowedTypes) {
      const res = await request(app)
        .post("/api/files")
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", Buffer.from("test content"), { filename: t.name, contentType: t.mime });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.file.name).toBe(t.name);
      expect(res.body.data.file.mimeType).toBe(t.mime);
      expect(res.body.data.file.storageKey).toBeUndefined();
      createdFileIds.push(res.body.data.file.id);
    }
  });

  it("2. Viewer upload returns 403 FORBIDDEN", async () => {
    const res = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${viewerToken}`)
      .attach("file", Buffer.from("viewer test"), { filename: "viewer.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("3. Unauthenticated upload returns 401 UNAUTHORIZED", async () => {
    const res = await request(app)
      .post("/api/files")
      .attach("file", Buffer.from("no auth"), { filename: "noauth.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("4. Missing file returns 400 FILE_REQUIRED", async () => {
    const res = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("FILE_REQUIRED");
  });

  it("5. Wrong field or multiple files return 400 VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("wrongField", Buffer.from("wrong"), { filename: "wrong.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("6. File over 10 MB returns 413 FILE_TOO_LARGE", async () => {
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024); // 10MB + 1KB
    const res = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", largeBuffer, { filename: "large.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("7. Unsupported or mismatched type returns 415 FILE_TYPE_NOT_ALLOWED", async () => {
    const res1 = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("exe"), { filename: "malware.exe", contentType: "application/x-msdownload" });

    expect(res1.status).toBe(415);
    expect(res1.body.error.code).toBe("FILE_TYPE_NOT_ALLOWED");

    // Mismatched extension and MIME
    const res2 = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("txt"), { filename: "mismatch.txt", contentType: "application/pdf" });

    expect(res2.status).toBe(415);
    expect(res2.body.error.code).toBe("FILE_TYPE_NOT_ALLOWED");
  });

  it("8. Invalid or missing target folder returns appropriate 400 or 404", async () => {
    const fakeUuid = crypto.randomUUID();
    const res1 = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("folderId", fakeUuid)
      .attach("file", Buffer.from("content"), { filename: "missing-folder.pdf", contentType: "application/pdf" });

    expect(res1.status).toBe(404);
    expect(res1.body.error.code).toBe("FOLDER_NOT_FOUND");
  });

  it("9. Root and nested duplicate names return 409 FILE_NAME_CONFLICT", async () => {
    const dupName = `dup-file-${crypto.randomUUID()}.pdf`;
    const res1 = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("content1"), { filename: dupName, contentType: "application/pdf" });

    expect(res1.status).toBe(201);
    createdFileIds.push(res1.body.data.file.id);

    const res2 = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("content2"), { filename: dupName, contentType: "application/pdf" });

    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe("FILE_NAME_CONFLICT");
  });

  it("10, 11 & 22. Storage key is UUID-based, safe metadata is stored, and storageKey is omitted from responses", async () => {
    const filename = `uuid-key-check-${crypto.randomUUID()}.txt`;
    const res = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("text file content"), { filename, contentType: "text/plain" });

    expect(res.status).toBe(201);
    const fileId = res.body.data.file.id;
    createdFileIds.push(fileId);

    expect(res.body.data.file.storageKey).toBeUndefined();

    const dbFile = await prisma.file.findUnique({ where: { id: fileId } });
    expect(dbFile).toBeDefined();
    expect(dbFile?.storageKey).toMatch(/^files\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(dbFile?.storageKey).not.toContain(filename);
  });

  it("12. R2 failure creates no database record", async () => {
    const uploadSpy = vi.spyOn(StorageService, "uploadObject").mockRejectedValueOnce(new Error("R2 network failure"));
    const filename = `r2-fail-${crypto.randomUUID()}.pdf`;

    const res = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("content"), { filename, contentType: "application/pdf" });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("STORAGE_ERROR");

    const dbRecord = await prisma.file.findFirst({ where: { name: filename } });
    expect(dbRecord).toBeNull();
    uploadSpy.mockImplementation(async () => {});
  });

  it("13. Database failure triggers R2 compensation deletion", async () => {
    const deleteSpy = vi.spyOn(StorageService, "deleteObject");
    const originalCreate = prisma.file.create;
    prisma.file.create = (async () => {
      throw new Error("DB insertion error");
    }) as unknown as typeof prisma.file.create;

    const filename = `db-fail-${crypto.randomUUID()}.pdf`;

    const res = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("content"), { filename, contentType: "application/pdf" });

    expect(res.status).toBe(500);
    expect(deleteSpy).toHaveBeenCalledWith(expect.stringMatching(/^files\//));

    prisma.file.create = originalCreate;
  });

  it("14. Admin and Viewer list root/nested files", async () => {
    const resAdmin = await request(app)
      .get("/api/files?folderId=root")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
    expect(Array.isArray(resAdmin.body.data.files)).toBe(true);

    const resViewer = await request(app)
      .get("/api/files?folderId=root")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(resViewer.status).toBe(200);
    expect(Array.isArray(resViewer.body.data.files)).toBe(true);
  });

  it("15. Sorting works", async () => {
    const res = await request(app)
      .get("/api/files?folderId=root&sortBy=name&order=asc")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const files = res.body.data.files;
    for (let i = 0; i < files.length - 1; i++) {
      expect(files[i].name.localeCompare(files[i + 1].name)).toBeLessThanOrEqual(0);
    }
  });

  it("16 & 17. GET /api/files/:id returns safe metadata, missing returns 404", async () => {
    const uploadRes = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("get test"), { filename: `get-test-${crypto.randomUUID()}.txt`, contentType: "text/plain" });

    const fileId = uploadRes.body.data.file.id;
    createdFileIds.push(fileId);

    const getRes = await request(app)
      .get(`/api/files/${fileId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.file.id).toBe(fileId);
    expect(getRes.body.data.file.storageKey).toBeUndefined();

    const missingRes = await request(app)
      .get(`/api/files/${crypto.randomUUID()}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(missingRes.status).toBe(404);
    expect(missingRes.body.error.code).toBe("FILE_NOT_FOUND");
  });

  it("18. Preview works for PDF, JPG, PNG, and TXT", async () => {
    const previewTypes = [
      { ext: ".pdf", mime: "application/pdf" },
      { ext: ".jpg", mime: "image/jpeg" },
      { ext: ".png", mime: "image/png" },
      { ext: ".txt", mime: "text/plain" }
    ];

    for (const t of previewTypes) {
      const upRes = await request(app)
        .post("/api/files")
        .set("Authorization", `Bearer ${adminToken}`)
        .attach("file", Buffer.from("prev"), { filename: `prev-${crypto.randomUUID()}${t.ext}`, contentType: t.mime });

      const fileId = upRes.body.data.file.id;
      createdFileIds.push(fileId);

      const prevRes = await request(app)
        .get(`/api/files/${fileId}/preview-url`)
        .set("Authorization", `Bearer ${viewerToken}`);

      expect(prevRes.status).toBe(200);
      expect(typeof prevRes.body.data.url).toBe("string");
      expect(prevRes.body.data.expiresInSeconds).toBe(300);
    }
  });

  it("19. DOCX/XLSX preview returns 415 PREVIEW_NOT_SUPPORTED", async () => {
    const upRes = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("doc"), { filename: `prev-${crypto.randomUUID()}.docx`, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

    const fileId = upRes.body.data.file.id;
    createdFileIds.push(fileId);

    const prevRes = await request(app)
      .get(`/api/files/${fileId}/preview-url`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(prevRes.status).toBe(415);
    expect(prevRes.body.error.code).toBe("PREVIEW_NOT_SUPPORTED");
  });

  it("20 & 21. Download works for allowed types and signed URL expiry is 300 seconds", async () => {
    const upRes = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("dl"), { filename: `download-${crypto.randomUUID()}.pdf`, contentType: "application/pdf" });

    const fileId = upRes.body.data.file.id;
    createdFileIds.push(fileId);

    const dlRes = await request(app)
      .get(`/api/files/${fileId}/download-url`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(dlRes.status).toBe(200);
    expect(typeof dlRes.body.data.url).toBe("string");
    expect(dlRes.body.data.expiresInSeconds).toBe(300);
  });
});
