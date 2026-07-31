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

describe("Folder Management Tests (Phase 5)", { timeout: 30000 }, () => {
  let adminToken: string;
  let viewerToken: string;
  const createdTopFolderIds: string[] = [];

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
  });

  afterAll(async () => {
    if (createdTopFolderIds.length > 0) {
      await prisma.folder.deleteMany({
        where: { id: { in: createdTopFolderIds } }
      });
    }
  });

  it("1. Admin lists root folders", async () => {
    const res = await request(app)
      .get("/api/folders?parentId=root")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.folders)).toBe(true);
  });

  it("2. Viewer lists root folders", async () => {
    const res = await request(app)
      .get("/api/folders?parentId=root")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.folders)).toBe(true);
  });

  it("3. Unauthenticated list returns 401", async () => {
    const res = await request(app).get("/api/folders");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("4. List direct children only", async () => {
    // Create parent and child
    const parentRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-p4-${crypto.randomUUID()}`, parentId: null });
    const parentId = parentRes.body.data.folder.id;
    createdTopFolderIds.push(parentId);

    const childRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-c4-${crypto.randomUUID()}`, parentId });
    const childId = childRes.body.data.folder.id;

    const listRes = await request(app)
      .get(`/api/folders?parentId=${parentId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.folders.length).toBe(1);
    expect(listRes.body.data.folders[0].id).toBe(childId);
  });

  it("5. Sort by name", async () => {
    const parentRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-sort-${crypto.randomUUID()}`, parentId: null });
    const parentId = parentRes.body.data.folder.id;
    createdTopFolderIds.push(parentId);

    await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "BBB_Folder", parentId });
    await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "AAA_Folder", parentId });

    const res = await request(app)
      .get(`/api/folders?parentId=${parentId}&sortBy=name&order=asc`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.folders[0].name).toBe("AAA_Folder");
    expect(res.body.data.folders[1].name).toBe("BBB_Folder");
  });

  it("6. Sort by created date", async () => {
    const parentRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-date-${crypto.randomUUID()}`, parentId: null });
    const parentId = parentRes.body.data.folder.id;
    createdTopFolderIds.push(parentId);

    const f1 = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "First_Folder", parentId });
    const f2 = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Second_Folder", parentId });

    const res = await request(app)
      .get(`/api/folders?parentId=${parentId}&sortBy=createdAt&order=desc`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.folders[0].id).toBe(f2.body.data.folder.id);
    expect(res.body.data.folders[1].id).toBe(f1.body.data.folder.id);
  });

  it("7. Invalid parent UUID returns 400", async () => {
    const res = await request(app)
      .get("/api/folders?parentId=invalid-uuid-format")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("8. Missing parent returns 404", async () => {
    const fakeUuid = crypto.randomUUID();
    const res = await request(app)
      .get(`/api/folders?parentId=${fakeUuid}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PARENT_FOLDER_NOT_FOUND");
  });

  it("9. Admin creates root folder", async () => {
    const name = `test-folder-root-${crypto.randomUUID()}`;
    const res = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name, parentId: null });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.folder).toEqual({
      id: expect.any(String),
      name,
      parentId: null,
      createdById: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });

    createdTopFolderIds.push(res.body.data.folder.id);
  });

  it("10. Admin creates nested folder", async () => {
    const rootRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-nest-root-${crypto.randomUUID()}`, parentId: null });
    const rootId = rootRes.body.data.folder.id;
    createdTopFolderIds.push(rootId);

    const name = `test-folder-nested-${crypto.randomUUID()}`;
    const res = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name, parentId: rootId });

    expect(res.status).toBe(201);
    expect(res.body.data.folder.parentId).toBe(rootId);
  });

  it("11. Viewer cannot create folder (403)", async () => {
    const res = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ name: "Viewer Folder Attempt", parentId: null });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("12. Duplicate root name returns 409", async () => {
    const name = `test-folder-dup-root-${crypto.randomUUID()}`;
    const firstRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name, parentId: null });
    createdTopFolderIds.push(firstRes.body.data.folder.id);

    const dupRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name, parentId: null });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe("FOLDER_NAME_CONFLICT");
  });

  it("13. Duplicate nested name returns 409", async () => {
    const rootRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-dup-nest-p-${crypto.randomUUID()}`, parentId: null });
    const rootId = rootRes.body.data.folder.id;
    createdTopFolderIds.push(rootId);

    const name = "ChildFolder";
    await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name, parentId: rootId });

    const dupRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name, parentId: rootId });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe("FOLDER_NAME_CONFLICT");
  });

  it("14. Invalid name returns 400", async () => {
    const res = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "", parentId: null });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("15. Admin renames folder", async () => {
    const createRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-orig-${crypto.randomUUID()}`, parentId: null });
    const folderId = createRes.body.data.folder.id;
    createdTopFolderIds.push(folderId);

    const newName = `test-folder-renamed-${crypto.randomUUID()}`;
    const res = await request(app)
      .patch(`/api/folders/${folderId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: newName });

    expect(res.status).toBe(200);
    expect(res.body.data.folder.name).toBe(newName);
  });

  it("16. Admin moves folder to another parent", async () => {
    const p1Res = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-p1-${crypto.randomUUID()}`, parentId: null });
    const p1Id = p1Res.body.data.folder.id;
    createdTopFolderIds.push(p1Id);

    const p2Res = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-p2-${crypto.randomUUID()}`, parentId: null });
    const p2Id = p2Res.body.data.folder.id;
    createdTopFolderIds.push(p2Id);

    const childRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-mov-child-${crypto.randomUUID()}`, parentId: p1Id });
    const childId = childRes.body.data.folder.id;

    const moveRes = await request(app)
      .patch(`/api/folders/${childId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ parentId: p2Id });

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.data.folder.parentId).toBe(p2Id);
  });

  it("17. Admin moves folder to root", async () => {
    const parentRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-mov-root-p-${crypto.randomUUID()}`, parentId: null });
    const parentId = parentRes.body.data.folder.id;
    createdTopFolderIds.push(parentId);

    const childRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-to-root-${crypto.randomUUID()}`, parentId });
    const childId = childRes.body.data.folder.id;

    const res = await request(app)
      .patch(`/api/folders/${childId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ parentId: null });

    expect(res.status).toBe(200);
    expect(res.body.data.folder.parentId).toBeNull();
    createdTopFolderIds.push(childId);
  });

  it("18. Admin renames and moves together", async () => {
    const parentRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-both-p-${crypto.randomUUID()}`, parentId: null });
    const parentId = parentRes.body.data.folder.id;
    createdTopFolderIds.push(parentId);

    const childRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-both-c-${crypto.randomUUID()}`, parentId });
    const childId = childRes.body.data.folder.id;

    const newName = `test-folder-both-renamed-${crypto.randomUUID()}`;
    const res = await request(app)
      .patch(`/api/folders/${childId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: newName, parentId: null });

    expect(res.status).toBe(200);
    expect(res.body.data.folder.name).toBe(newName);
    expect(res.body.data.folder.parentId).toBeNull();
    createdTopFolderIds.push(childId);
  });

  it("19. Duplicate at target returns 409", async () => {
    const targetRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-target-${crypto.randomUUID()}`, parentId: null });
    const targetId = targetRes.body.data.folder.id;
    createdTopFolderIds.push(targetId);

    await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "ConflictName", parentId: targetId });

    const sourceRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "ConflictName", parentId: null });
    const sourceId = sourceRes.body.data.folder.id;
    createdTopFolderIds.push(sourceId);

    const res = await request(app)
      .patch(`/api/folders/${sourceId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ parentId: targetId });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("FOLDER_NAME_CONFLICT");
  });

  it("20. Folder cannot move into itself", async () => {
    const fRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-self-${crypto.randomUUID()}`, parentId: null });
    const fId = fRes.body.data.folder.id;
    createdTopFolderIds.push(fId);

    const res = await request(app)
      .patch(`/api/folders/${fId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ parentId: fId });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("FOLDER_CYCLE");
  });

  it("21. Folder cannot move into a descendant", async () => {
    const pRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-cycle-p-${crypto.randomUUID()}`, parentId: null });
    const pId = pRes.body.data.folder.id;
    createdTopFolderIds.push(pId);

    const cRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-cycle-c-${crypto.randomUUID()}`, parentId: pId });
    const cId = cRes.body.data.folder.id;

    const gcRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-cycle-gc-${crypto.randomUUID()}`, parentId: cId });
    const gcId = gcRes.body.data.folder.id;

    // Try moving parent pId into grandchild gcId
    const res = await request(app)
      .patch(`/api/folders/${pId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ parentId: gcId });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("FOLDER_CYCLE");
  });

  it("22. Missing source returns 404", async () => {
    const fakeUuid = crypto.randomUUID();
    const res = await request(app)
      .patch(`/api/folders/${fakeUuid}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Updated Name" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("FOLDER_NOT_FOUND");
  });

  it("23. Missing target returns 404", async () => {
    const fRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-missing-t-${crypto.randomUUID()}`, parentId: null });
    const fId = fRes.body.data.folder.id;
    createdTopFolderIds.push(fId);

    const fakeUuid = crypto.randomUUID();
    const res = await request(app)
      .patch(`/api/folders/${fId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ parentId: fakeUuid });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PARENT_FOLDER_NOT_FOUND");
  });

  it("24. Viewer cannot patch folder", async () => {
    const fRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-no-patch-${crypto.randomUUID()}`, parentId: null });
    const fId = fRes.body.data.folder.id;
    createdTopFolderIds.push(fId);

    const res = await request(app)
      .patch(`/api/folders/${fId}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ name: "Attempted Patch" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("25. Empty or unknown patch body returns 400", async () => {
    const fRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-empty-body-${crypto.randomUUID()}`, parentId: null });
    const fId = fRes.body.data.folder.id;
    createdTopFolderIds.push(fId);

    const emptyRes = await request(app)
      .patch(`/api/folders/${fId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(emptyRes.status).toBe(400);

    const unknownRes = await request(app)
      .patch(`/api/folders/${fId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ unknownField: true });
    expect(unknownRes.status).toBe(400);
  });

  it("26, 28 & 29. Admin recursively deletes an empty nested folder tree returning 204 with no body", async () => {
    const pRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-del-p-${crypto.randomUUID()}`, parentId: null });
    const pId = pRes.body.data.folder.id;

    await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-del-c-${crypto.randomUUID()}`, parentId: pId });

    const delRes = await request(app)
      .delete(`/api/folders/${pId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(delRes.status).toBe(204);
    expect(delRes.text).toBe("");

    // Missing delete target returns 404
    const notFoundRes = await request(app)
      .delete(`/api/folders/${pId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error.code).toBe("FOLDER_NOT_FOUND");
  });

  it("27. Viewer cannot delete folder", async () => {
    const fRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `test-folder-no-del-${crypto.randomUUID()}`, parentId: null });
    const fId = fRes.body.data.folder.id;
    createdTopFolderIds.push(fId);

    const res = await request(app)
      .delete(`/api/folders/${fId}`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
