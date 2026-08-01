import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import dotenv from "dotenv";
import { app } from "../src/app.js";

dotenv.config();

const viewerEmail = process.env.SEED_VIEWER_EMAIL || "viewer@bgain.com";
const viewerPassword = process.env.SEED_VIEWER_PASSWORD || "viewerpassword";

describe("Security Hardening & RBAC Matrix Tests (Phase 9)", { timeout: 30000 }, () => {
  let viewerToken: string;

  beforeAll(async () => {
    const viewerLoginRes = await request(app).post("/api/auth/login").send({
      email: viewerEmail,
      password: viewerPassword
    });
    viewerToken = viewerLoginRes.body.data.accessToken;
  });

  it("1. JSON payload over 1 MB returns 413 PAYLOAD_TOO_LARGE", async () => {
    const largeJsonObj = { data: "a".repeat(1024 * 1024 + 100) };
    const res = await request(app)
      .post("/api/search")
      .send(largeJsonObj);

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("2. Disallowed CORS origin returns 403 CORS_NOT_ALLOWED", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("Origin", "http://evil-unauthorized-site.com");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CORS_NOT_ALLOWED");
  });

  it("3. Complete Viewer RBAC rejection matrix for all Admin write routes", async () => {
    const fakeUuid = "00000000-0000-0000-0000-000000000000";

    // 1. POST /api/users
    const userRes = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ name: "Test", email: "test@example.com", password: "Password123!", role: "VIEWER" });
    expect(userRes.status).toBe(403);

    // 2. POST /api/folders
    const folderRes = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ name: "Folder", parentId: null });
    expect(folderRes.status).toBe(403);

    // 3. PATCH /api/folders/:id
    const folderPatchRes = await request(app)
      .patch(`/api/folders/${fakeUuid}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ name: "NewName" });
    expect(folderPatchRes.status).toBe(403);

    // 4. DELETE /api/folders/:id
    const folderDelRes = await request(app)
      .delete(`/api/folders/${fakeUuid}`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(folderDelRes.status).toBe(403);

    // 5. POST /api/files
    const filePostRes = await request(app)
      .post("/api/files")
      .set("Authorization", `Bearer ${viewerToken}`)
      .attach("file", Buffer.from("data"), "test.txt");
    expect(filePostRes.status).toBe(403);

    // 6. PATCH /api/files/:id
    const filePatchRes = await request(app)
      .patch(`/api/files/${fakeUuid}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ name: "test2.txt" });
    expect(filePatchRes.status).toBe(403);

    // 7. DELETE /api/files/:id
    const fileDelRes = await request(app)
      .delete(`/api/files/${fakeUuid}`)
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(fileDelRes.status).toBe(403);
  });

  it("4. Unknown route returns standard 404 NOT_FOUND envelope", async () => {
    const res = await request(app).get("/api/non-existent-endpoint");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toBe("Route not found");
  });
});
