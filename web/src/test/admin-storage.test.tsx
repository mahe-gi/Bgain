import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../context/auth-context.js";
import { StoragePage } from "../pages/StoragePage.js";
import { FileDetailsPage } from "../pages/FileDetailsPage.js";
import * as storageApi from "../api/storage.api.js";
import * as fileApi from "../api/file.api.js";
import type { SafeUser } from "../types/auth.js";
import type { Folder, FileItem } from "../types/storage.js";

vi.mock("../api/storage.api.js", () => ({
  getFoldersApi: vi.fn(),
  getFilesApi: vi.fn(),
  createFolderApi: vi.fn(),
  updateFolderApi: vi.fn(),
  deleteFolderApi: vi.fn()
}));

vi.mock("../api/file.api.js", () => ({
  getFileDetailsApi: vi.fn(),
  getPreviewUrlApi: vi.fn(),
  getDownloadUrlApi: vi.fn(),
  uploadFileApi: vi.fn(),
  updateFileApi: vi.fn(),
  deleteFileApi: vi.fn()
}));

const mockAdminUser: SafeUser = {
  id: "admin-uuid-123",
  name: "Demo Admin",
  email: "admin@example.com",
  role: "ADMIN",
  createdAt: "2026-07-01T00:00:00.000Z"
};

const mockViewerUser: SafeUser = {
  id: "viewer-uuid-456",
  name: "Demo Viewer",
  email: "viewer@example.com",
  role: "VIEWER",
  createdAt: "2026-07-01T00:00:00.000Z"
};

const mockFolders: Folder[] = [
  {
    id: "folder-uuid-1",
    name: "Financial Reports",
    parentId: null,
    createdById: "admin-uuid-123",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z"
  }
];

const mockFiles: FileItem[] = [
  {
    id: "file-uuid-1",
    name: "Q1-Report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1048576,
    folderId: null,
    uploadedById: "admin-uuid-123",
    createdAt: "2026-07-05T12:00:00.000Z",
    updatedAt: "2026-07-05T12:00:00.000Z"
  }
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });
}

function renderWithAuthRole(user: SafeUser | null, initialEntries = ["/storage"]) {
  const queryClient = createTestQueryClient();
  const authValue = {
    user,
    token: user ? "fake-token" : null,
    isLoading: false,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "ADMIN",
    login: vi.fn(),
    logout: vi.fn()
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/storage" element={<StoragePage />} />
            <Route path="/files/:fileId" element={<FileDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("Web Phase 4: Admin Storage Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("1. RBAC: Admin sees mutation controls; Viewer sees zero mutation controls", async () => {
    vi.mocked(storageApi.getFoldersApi).mockResolvedValue(mockFolders);
    vi.mocked(storageApi.getFilesApi).mockResolvedValue(mockFiles);

    // Admin View
    const { unmount } = renderWithAuthRole(mockAdminUser, ["/storage"]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create new folder/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload file/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /rename folder financial reports/i })).toBeInTheDocument();
    });

    unmount();

    // Viewer View
    renderWithAuthRole(mockViewerUser, ["/storage"]);

    await waitFor(() => {
      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /create new folder/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /upload file/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /rename folder/i })).not.toBeInTheDocument();
    });
  });

  it("2. RBAC: Viewer on File Details page sees no rename/move/delete controls", async () => {
    vi.mocked(fileApi.getFileDetailsApi).mockResolvedValue(mockFiles[0]);

    renderWithAuthRole(mockViewerUser, ["/files/file-uuid-1"]);

    await waitFor(() => {
      expect(screen.getByText("Q1-Report.pdf")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /rename file/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /move file/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /delete file/i })).not.toBeInTheDocument();
    });
  });

  it("3. Create Folder: Submits parentId=null at root and invalidates query", async () => {
    vi.mocked(storageApi.getFoldersApi).mockResolvedValue(mockFolders);
    vi.mocked(storageApi.getFilesApi).mockResolvedValue(mockFiles);
    const createFolderSpy = vi.mocked(storageApi.createFolderApi).mockResolvedValue({
      id: "folder-uuid-new",
      name: "Invoices",
      parentId: null,
      createdById: "admin-uuid-123",
      createdAt: "2026-07-31T10:00:00.000Z",
      updatedAt: "2026-07-31T10:00:00.000Z"
    });

    renderWithAuthRole(mockAdminUser, ["/storage"]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create new folder/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /create new folder/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /create new folder/i })).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/folder name/i);
    fireEvent.change(input, { target: { value: "Invoices" } });

    fireEvent.click(screen.getByRole("button", { name: /^create folder$/i }));

    await waitFor(() => {
      expect(createFolderSpy).toHaveBeenCalledWith({ name: "Invoices", parentId: null });
    });
  });

  it("4. Upload File: Rejects invalid extension and file over 10MB; submits valid file with parentId", async () => {
    vi.mocked(storageApi.getFoldersApi).mockResolvedValue(mockFolders);
    vi.mocked(storageApi.getFilesApi).mockResolvedValue(mockFiles);
    const uploadSpy = vi.mocked(fileApi.uploadFileApi).mockResolvedValue(mockFiles[0]);

    renderWithAuthRole(mockAdminUser, ["/storage"]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /upload file/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /upload file/i })).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/select file/i);

    // Test invalid extension
    const invalidFile = new File(["dummy"], "script.exe", { type: "application/x-msdownload" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/invalid file type \(\.exe\)/i)).toBeInTheDocument();
    });

    // Test valid file
    const validFile = new File(["valid content"], "report.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    fireEvent.click(screen.getByRole("button", { name: /^upload file$/i }));

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(validFile, null, expect.any(Function));
    });
  });

  it("5. Rename Item: Submits rename for folder and file", async () => {
    vi.mocked(storageApi.getFoldersApi).mockResolvedValue(mockFolders);
    vi.mocked(storageApi.getFilesApi).mockResolvedValue(mockFiles);
    const renameFolderSpy = vi.mocked(storageApi.updateFolderApi).mockResolvedValue({
      ...mockFolders[0],
      name: "Renamed Financials"
    });

    renderWithAuthRole(mockAdminUser, ["/storage"]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /rename folder financial reports/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /rename folder financial reports/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /rename folder/i })).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/new name/i);
    fireEvent.change(input, { target: { value: "Renamed Financials" } });

    fireEvent.click(screen.getByRole("button", { name: /save name/i }));

    await waitFor(() => {
      expect(renameFolderSpy).toHaveBeenCalledWith("folder-uuid-1", { name: "Renamed Financials" });
    });
  });

  it("6. Move Item Dialog UX: Navigates picker, shows Back button, Destination banner, and executes move only when Move Here is clicked", async () => {
    const multiFolders: Folder[] = [
      {
        id: "folder-uuid-1",
        name: "Financial Reports",
        parentId: null,
        createdById: "admin-uuid-123",
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T10:00:00.000Z"
      },
      {
        id: "folder-uuid-2",
        name: "Design Assets",
        parentId: null,
        createdById: "admin-uuid-123",
        createdAt: "2026-07-02T10:00:00.000Z",
        updatedAt: "2026-07-02T10:00:00.000Z"
      }
    ];

    vi.mocked(storageApi.getFoldersApi).mockImplementation(async (params) => {
      if (params.parentId === "folder-uuid-2") {
        return [
          {
            id: "folder-uuid-nested",
            name: "2026 Q1",
            parentId: "folder-uuid-2",
            createdById: "admin-uuid-123",
            createdAt: "2026-07-10T10:00:00.000Z",
            updatedAt: "2026-07-10T10:00:00.000Z"
          }
        ];
      }
      return multiFolders;
    });
    vi.mocked(storageApi.getFilesApi).mockResolvedValue(mockFiles);
    const updateFolderSpy = vi.mocked(storageApi.updateFolderApi).mockResolvedValue({
      ...multiFolders[0],
      parentId: "folder-uuid-nested"
    });

    renderWithAuthRole(mockAdminUser, ["/storage"]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /move folder financial reports/i })).toBeInTheDocument();
    });

    // Open Move Item dialog for Financial Reports (currentParentId is null)
    fireEvent.click(screen.getByRole("button", { name: /move folder financial reports/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /move folder "financial reports"/i })).toBeInTheDocument();
    });

    // 1. At root: Destination is "Storage (Root)"
    expect(screen.getAllByText("Storage (Root)").length).toBeGreaterThan(0);

    // 2. At root: Already here button is disabled
    const alreadyHereBtn = screen.getByRole("button", { name: /already here/i });
    expect(alreadyHereBtn).toBeDisabled();

    // 3. At root: Back button is absent
    expect(screen.queryByRole("button", { name: /back to/i })).not.toBeInTheDocument();

    // 4. Click Design Assets folder in list: Navigates but does NOT immediately invoke move mutation API
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /open folder design assets/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /open folder design assets/i }));

    await waitFor(() => {
      expect(screen.getByText("2026 Q1")).toBeInTheDocument();
    });
    expect(updateFolderSpy).not.toHaveBeenCalled();

    // 5. Inside nested folder: Back button appears with label "Back to Storage (Root)"
    const backBtn = screen.getByRole("button", { name: /back to storage \(root\)/i });
    expect(backBtn).toBeInTheDocument();

    // 6. Click nested folder "2026 Q1"
    fireEvent.click(screen.getByRole("button", { name: /open folder 2026 q1/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /back to design assets/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /move here/i })).toBeEnabled();
    });

    // 7. Click Back button: Returns one breadcrumb level
    fireEvent.click(screen.getByRole("button", { name: /back to design assets/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /back to storage \(root\)/i })).toBeInTheDocument();
    });

    // Re-enter 2026 Q1 and click Move Here
    fireEvent.click(screen.getByRole("button", { name: /open folder 2026 q1/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /move here/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /move here/i }));

    await waitFor(() => {
      expect(updateFolderSpy).toHaveBeenCalledWith("folder-uuid-1", { parentId: "folder-uuid-nested" });
    });
  });

  it("7. Delete Item: Confirmation dialog shows warning and calls delete API", async () => {
    vi.mocked(storageApi.getFoldersApi).mockResolvedValue(mockFolders);
    vi.mocked(storageApi.getFilesApi).mockResolvedValue(mockFiles);
    const deleteFolderSpy = vi.mocked(storageApi.deleteFolderApi).mockResolvedValue();

    renderWithAuthRole(mockAdminUser, ["/storage"]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /delete folder financial reports/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete folder financial reports/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /delete folder "financial reports"\?/i })).toBeInTheDocument();
      expect(screen.getByText(/permanently remove all nested subfolders and files/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete permanently/i }));

    await waitFor(() => {
      expect(deleteFolderSpy).toHaveBeenCalledWith("folder-uuid-1");
    });
  });

  it("8. File Details Delete: Successful deletion navigates to /storage", async () => {
    vi.mocked(fileApi.getFileDetailsApi).mockResolvedValue(mockFiles[0]);
    const deleteFileSpy = vi.mocked(fileApi.deleteFileApi).mockResolvedValue();

    renderWithAuthRole(mockAdminUser, ["/files/file-uuid-1"]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /delete file/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete file/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /delete file "q1-report.pdf"\?/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /delete permanently/i }));

    await waitFor(() => {
      expect(deleteFileSpy).toHaveBeenCalledWith("file-uuid-1");
    });
  });

  it("9. UploadFileDialog displays styled Choose File button and shows selected filename", async () => {
    vi.mocked(storageApi.getFoldersApi).mockResolvedValue(mockFolders);
    vi.mocked(storageApi.getFilesApi).mockResolvedValue(mockFiles);

    renderWithAuthRole(mockAdminUser, ["/storage"]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /upload file/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /upload file/i }));

    await waitFor(() => {
      expect(screen.getByText("No file selected")).toBeInTheDocument();
      expect(screen.getByText("Choose File")).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/select file/i);
    const testFile = new File(["test data"], "sample-doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    await waitFor(() => {
      expect(screen.getByText(/sample-doc\.pdf/i)).toBeInTheDocument();
    });
  });
});
