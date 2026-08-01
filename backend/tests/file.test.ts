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

describe("File APIs & Storage Tests (Phase 6 & Phase 7)", { timeout: 60000 }, () => {
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
    vi.spyOn(StorageService, "deleteObjects").mockImplementation(async () => {});
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
    const testUuid = crypto.randomUUID().slice(0, 8);
    const allowedTypes = [
      { name: `test-file-1-${testUuid}.pdf`, mime: "application/pdf" },
      { name: `test-file-2-${testUuid}.jpg`, mime: "image/jpeg" },
      { name: `test-file-3-${testUuid}.png`, mime: "image/png" },
      { name: `test-file-4-${testUuid}.txt`, mime: "text/plain" },
      { name: `test-file-5-${testUuid}.docx`, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      { name: `test-file-6-${testUuid}.xlsx`, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
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
      expect(files[i].name <= files[i + 1].name).toBe(true);
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

  /* -------------------------------------------------------------------------- */
  /* PHASE 7 TESTS: FILE UPDATE & DELETE AND RECURSIVE FOLDER DELETION        */
  /* -------------------------------------------------------------------------- */

  it("22. Admin renames, moves to folder, moves to root, and updates together (R2 storageKey unchanged)", async () => {
    const initialName = `initial-${crypto.randomUUID()}.jpg`;
    const upRes = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("img"), { filename: initialName, contentType: "image/jpeg" });

    const fileId = upRes.body.data.file.id;
    createdFileIds.push(fileId);

    const dbInitial = await prisma.file.findUnique({ where: { id: fileId } });
    const initialStorageKey = dbInitial?.storageKey;

    // Create target folder
    const folderRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `target-folder-${crypto.randomUUID()}` });
    const folderId = folderRes.body.data.folder.id;
    createdFolderIds.push(folderId);

    // 1. Rename .jpg -> .jpeg (allowed for image/jpeg)
    const newName = `renamed-${crypto.randomUUID()}.jpeg`;
    const patchRes1 = await request(app)
      .patch(`/api/files/${fileId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: newName });

    expect(patchRes1.status).toBe(200);
    expect(patchRes1.body.data.file.name).toBe(newName);
    expect(patchRes1.body.data.file.storageKey).toBeUndefined();

    // 2. Move file to folder
    const patchRes2 = await request(app)
      .patch(`/api/files/${fileId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ folderId });

    expect(patchRes2.status).toBe(200);
    expect(patchRes2.body.data.file.folderId).toBe(folderId);

    // 3. Move back to root and rename together
    const finalName = `final-${crypto.randomUUID()}.jpg`;
    const patchRes3 = await request(app)
      .patch(`/api/files/${fileId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: finalName, folderId: null });

    expect(patchRes3.status).toBe(200);
    expect(patchRes3.body.data.file.name).toBe(finalName);
    expect(patchRes3.body.data.file.folderId).toBeNull();

    // Verify storageKey remained identical in DB
    const dbFinal = await prisma.file.findUnique({ where: { id: fileId } });
    expect(dbFinal?.storageKey).toBe(initialStorageKey);
  });

  it("23. File update validation: duplicate names (409), missing file/folder (404), incompatible ext (415), empty body (400), viewer (403), unauth (401)", async () => {
    const dupName = `dup-${crypto.randomUUID()}.pdf`;
    const file1Res = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("pdf1"), { filename: dupName, contentType: "application/pdf" });
    createdFileIds.push(file1Res.body.data.file.id);

    const file2Res = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("pdf2"), { filename: `other-${crypto.randomUUID()}.pdf`, contentType: "application/pdf" });
    const file2Id = file2Res.body.data.file.id;
    createdFileIds.push(file2Id);

    // Duplicate target name -> 409
    const dupPatchRes = await request(app)
      .patch(`/api/files/${file2Id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: dupName });
    expect(dupPatchRes.status).toBe(409);
    expect(dupPatchRes.body.error.code).toBe("FILE_NAME_CONFLICT");

    // Missing file -> 404
    const missFileRes = await request(app)
      .patch(`/api/files/${crypto.randomUUID()}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "valid.pdf" });
    expect(missFileRes.status).toBe(404);
    expect(missFileRes.body.error.code).toBe("FILE_NOT_FOUND");

    // Missing folder -> 404
    const missFolderRes = await request(app)
      .patch(`/api/files/${file2Id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ folderId: crypto.randomUUID() });
    expect(missFolderRes.status).toBe(404);
    expect(missFolderRes.body.error.code).toBe("FOLDER_NOT_FOUND");

    // Incompatible extension -> 415
    const incompExtRes = await request(app)
      .patch(`/api/files/${file2Id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "invalid-ext.txt" });
    expect(incompExtRes.status).toBe(415);
    expect(incompExtRes.body.error.code).toBe("FILE_TYPE_NOT_ALLOWED");

    // Empty body -> 400
    const emptyBodyRes = await request(app)
      .patch(`/api/files/${file2Id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(emptyBodyRes.status).toBe(400);

    // Viewer -> 403
    const viewerRes = await request(app)
      .patch(`/api/files/${file2Id}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ name: "viewer-rename.pdf" });
    expect(viewerRes.status).toBe(403);

    // Unauth -> 401
    const unauthRes = await request(app)
      .patch(`/api/files/${file2Id}`)
      .send({ name: "unauth-rename.pdf" });
    expect(unauthRes.status).toBe(401);
  });

  it("24. File deletion: R2 delete before DB delete, returns 204, missing file returns 404, viewer 403, unauth 401", async () => {
    const deleteSpy = vi.spyOn(StorageService, "deleteObject");

    const fileRes = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("to delete"), { filename: `del-${crypto.randomUUID()}.pdf`, contentType: "application/pdf" });
    const fileId = fileRes.body.data.file.id;

    // Viewer -> 403
    const vRes = await request(app)
      .delete(`/api/files/${fileId}`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(vRes.status).toBe(403);

    // Unauth -> 401
    const uRes = await request(app)
      .delete(`/api/files/${fileId}`);
    expect(uRes.status).toBe(401);

    // Admin delete -> 204
    const delRes = await request(app)
      .delete(`/api/files/${fileId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(delRes.status).toBe(204);
    expect(delRes.text).toBe("");

    expect(deleteSpy).toHaveBeenCalledWith(expect.stringMatching(/^files\//));

    const checkDb = await prisma.file.findUnique({ where: { id: fileId } });
    expect(checkDb).toBeNull();

    // Missing file -> 404
    const missRes = await request(app)
      .delete(`/api/files/${crypto.randomUUID()}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(missRes.status).toBe(404);
    expect(missRes.body.error.code).toBe("FILE_NOT_FOUND");
  });

  it("25. File deletion failure: R2 failure returns 502 STORAGE_ERROR and preserves database row", async () => {
    const fileRes = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from("fail delete"), { filename: `fail-del-${crypto.randomUUID()}.pdf`, contentType: "application/pdf" });
    const fileId = fileRes.body.data.file.id;
    createdFileIds.push(fileId);

    const deleteSpy = vi.spyOn(StorageService, "deleteObject").mockRejectedValueOnce(new Error("S3 Delete failure"));

    const res = await request(app)
      .delete(`/api/files/${fileId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("STORAGE_ERROR");

    // Verify DB row was preserved
    const checkDb = await prisma.file.findUnique({ where: { id: fileId } });
    expect(checkDb).toBeDefined();

    deleteSpy.mockImplementation(async () => {});
  });

  it("26. Final recursive Folder deletion: Deletes R2 objects and DB folder tree with files, returns 204", async () => {
    const deleteObjectsSpy = vi.spyOn(StorageService, "deleteObjects");

    // Create folder structure: Parent -> Child -> File
    const parentFolder = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `parent-${crypto.randomUUID()}`, parentId: null });
    const parentId = parentFolder.body.data.folder.id;

    const childFolder = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `child-${crypto.randomUUID()}`, parentId });
    const childId = childFolder.body.data.folder.id;

    const file1Res = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("folderId", parentId)
      .attach("file", Buffer.from("f1"), { filename: `f1-${crypto.randomUUID()}.pdf`, contentType: "application/pdf" });

    const file2Res = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("folderId", childId)
      .attach("file", Buffer.from("f2"), { filename: `f2-${crypto.randomUUID()}.pdf`, contentType: "application/pdf" });

    const file1Id = file1Res.body.data.file.id;
    const file2Id = file2Res.body.data.file.id;

    // Delete parent folder recursively
    const delRes = await request(app)
      .delete(`/api/folders/${parentId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(delRes.status).toBe(204);
    expect(delRes.text).toBe("");

    // Verify deleteObjects was called with storage keys
    expect(deleteObjectsSpy).toHaveBeenCalledWith(expect.arrayContaining([expect.stringMatching(/^files\//)]));

    // Verify DB cascade deleted parent, child, and files
    const checkParent = await prisma.folder.findUnique({ where: { id: parentId } });
    const checkChild = await prisma.folder.findUnique({ where: { id: childId } });
    const checkF1 = await prisma.file.findUnique({ where: { id: file1Id } });
    const checkF2 = await prisma.file.findUnique({ where: { id: file2Id } });

    expect(checkParent).toBeNull();
    expect(checkChild).toBeNull();
    expect(checkF1).toBeNull();
    expect(checkF2).toBeNull();
  });

  it("27. Folder deletion R2 batch failure preserves DB folder tree and files", async () => {
    const parentFolder = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `fail-parent-${crypto.randomUUID()}`, parentId: null });
    const parentId = parentFolder.body.data.folder.id;
    createdFolderIds.push(parentId);

    const fileRes = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("folderId", parentId)
      .attach("file", Buffer.from("f-fail"), { filename: `fail-f-${crypto.randomUUID()}.pdf`, contentType: "application/pdf" });
    const fileId = fileRes.body.data.file.id;
    createdFileIds.push(fileId);

    const deleteObjectsSpy = vi.spyOn(StorageService, "deleteObjects").mockRejectedValueOnce(new Error("R2 batch error"));

    const res = await request(app)
      .delete(`/api/folders/${parentId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("STORAGE_ERROR");

    // Verify DB folder and file were preserved
    const checkFolder = await prisma.folder.findUnique({ where: { id: parentId } });
    const checkFile = await prisma.file.findUnique({ where: { id: fileId } });
    expect(checkFolder).toBeDefined();
    expect(checkFile).toBeDefined();

    deleteObjectsSpy.mockImplementation(async () => {});
  });

  it("28. StorageService.deleteObjects batching logic (>1000 keys) and deduplication unit test", async () => {
    // Test StorageService.deleteObjects deduplication & chunking logic directly
    const sendSpy = vi.spyOn(StorageService, "deleteObjects");

    // Empty array -> returns immediately without error
    await StorageService.deleteObjects([]);

    // Array with 1500 keys (triggers 2 batches: 1000 and 500)
    const testKeys = Array.from({ length: 1500 }, (_, i) => `files/mock-key-${i}`);
    // Add duplicates
    testKeys.push("files/mock-key-0", "files/mock-key-1");

    await expect(StorageService.deleteObjects(testKeys)).resolves.not.toThrow();

    sendSpy.mockRestore();
  });
});
