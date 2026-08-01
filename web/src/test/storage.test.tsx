import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StoragePage } from "../pages/StoragePage.js";
import * as storageApi from "../api/storage.api.js";
import type { Folder, FileItem } from "../types/storage.js";

vi.mock("../api/storage.api.js", () => ({
  getFoldersApi: vi.fn(),
  getFilesApi: vi.fn()
}));

const mockRootFolders: Folder[] = [
  {
    id: "folder-uuid-1",
    name: "Financial Reports",
    parentId: null,
    createdById: "user-uuid-1",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z"
  },
  {
    id: "folder-uuid-2",
    name: "Design Assets",
    parentId: null,
    createdById: "user-uuid-1",
    createdAt: "2026-07-02T10:00:00.000Z",
    updatedAt: "2026-07-02T10:00:00.000Z"
  }
];

const mockRootFiles: FileItem[] = [
  {
    id: "file-uuid-101",
    name: "Company-Overview.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2097152,
    folderId: null,
    uploadedById: "user-uuid-1",
    createdAt: "2026-07-05T12:00:00.000Z",
    updatedAt: "2026-07-05T12:00:00.000Z"
  }
];

const mockNestedFolders: Folder[] = [
  {
    id: "folder-uuid-nested",
    name: "2026 Q1",
    parentId: "folder-uuid-1",
    createdById: "user-uuid-1",
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-07-10T10:00:00.000Z"
  }
];

const mockNestedFiles: FileItem[] = [
  {
    id: "file-uuid-nested-201",
    name: "Q1-Invoice.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeBytes: 512000,
    folderId: "folder-uuid-1",
    uploadedById: "user-uuid-1",
    createdAt: "2026-07-12T15:00:00.000Z",
    updatedAt: "2026-07-12T15:00:00.000Z"
  }
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });
}

function renderStorage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <StoragePage />
    </QueryClientProvider>
  );
}

describe("Storage Browser Page (Web Phase 2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Loads root folders and files with parentId=root and folderId=root", async () => {
    const getFoldersSpy = vi.mocked(storageApi.getFoldersApi).mockImplementation(async () => mockRootFolders);
    const getFilesSpy = vi.mocked(storageApi.getFilesApi).mockImplementation(async () => mockRootFiles);

    renderStorage();

    await waitFor(() => {
      expect(getFoldersSpy).toHaveBeenCalledWith({ parentId: "root", sortBy: "name", order: "asc" });
      expect(getFilesSpy).toHaveBeenCalledWith({ folderId: "root", sortBy: "name", order: "asc" });

      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
      expect(screen.getByText("Design Assets")).toBeInTheDocument();
      expect(screen.getAllByText("Company-Overview.pdf").length).toBeGreaterThan(0);
      expect(screen.getByText("2 folders, 1 file")).toBeInTheDocument();
    });
  });

  it("2. Opens a nested folder and updates breadcrumbs and query parameters", async () => {
    vi.mocked(storageApi.getFoldersApi).mockImplementation(async (params) => {
      if (params.parentId === "folder-uuid-1") return mockNestedFolders;
      return mockRootFolders;
    });

    vi.mocked(storageApi.getFilesApi).mockImplementation(async (params) => {
      if (params.folderId === "folder-uuid-1") return mockNestedFiles;
      return mockRootFiles;
    });

    renderStorage();

    await waitFor(() => {
      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
    });

    // Click on Financial Reports folder
    fireEvent.click(screen.getByText("Financial Reports"));

    await waitFor(() => {
      expect(screen.getByText("2026 Q1")).toBeInTheDocument();
      expect(screen.getAllByText("Q1-Invoice.xlsx").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Excel Spreadsheet (.xlsx)").length).toBeGreaterThan(0);
      expect(screen.getByText("1 folder, 1 file")).toBeInTheDocument();
    });
  });

  it("3. Breadcrumb navigation returns user to parent / root", async () => {
    vi.mocked(storageApi.getFoldersApi).mockImplementation(async (params) => {
      if (params.parentId === "folder-uuid-1") return mockNestedFolders;
      return mockRootFolders;
    });

    vi.mocked(storageApi.getFilesApi).mockImplementation(async (params) => {
      if (params.folderId === "folder-uuid-1") return mockNestedFiles;
      return mockRootFiles;
    });

    renderStorage();

    await waitFor(() => {
      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
    });

    // Navigate to nested folder
    fireEvent.click(screen.getByText("Financial Reports"));

    await waitFor(() => {
      expect(screen.getByText("2026 Q1")).toBeInTheDocument();
    });

    // Storage is index 0 (not last), so it renders as a clickable button
    const rootBreadcrumbBtn = screen.getByRole("button", { name: "Storage" });
    fireEvent.click(rootBreadcrumbBtn);

    await waitFor(() => {
      expect(screen.getByText("Design Assets")).toBeInTheDocument();
      expect(screen.getAllByText("Company-Overview.pdf").length).toBeGreaterThan(0);
    });
  });

  it("4. Sorting control dropdown updates sortBy and order query parameters", async () => {
    const getFoldersSpy = vi.mocked(storageApi.getFoldersApi).mockImplementation(async () => mockRootFolders);
    const getFilesSpy = vi.mocked(storageApi.getFilesApi).mockImplementation(async () => mockRootFiles);

    renderStorage();

    await waitFor(() => {
      expect(screen.getByLabelText("Sort by")).toBeInTheDocument();
    });

    // Change sort to Newest first
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "newest" } });

    await waitFor(() => {
      expect(getFoldersSpy).toHaveBeenCalledWith({ parentId: "root", sortBy: "createdAt", order: "desc" });
      expect(getFilesSpy).toHaveBeenCalledWith({ folderId: "root", sortBy: "createdAt", order: "desc" });
    });
  });

  it("5. Refresh button refetches both folders and files", async () => {
    const getFoldersSpy = vi.mocked(storageApi.getFoldersApi).mockImplementation(async () => mockRootFolders);
    const getFilesSpy = vi.mocked(storageApi.getFilesApi).mockImplementation(async () => mockRootFiles);

    renderStorage();

    await waitFor(() => {
      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole("button", { name: /refresh storage content/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(getFoldersSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(getFilesSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("6. Displays empty location state when folder contains 0 folders and 0 files", async () => {
    vi.mocked(storageApi.getFoldersApi).mockImplementation(async () => []);
    vi.mocked(storageApi.getFilesApi).mockImplementation(async () => []);

    renderStorage();

    await waitFor(() => {
      expect(screen.getByTestId("storage-empty")).toBeInTheDocument();
      expect(screen.getByText("This folder is empty")).toBeInTheDocument();
    });
  });

  it("7. Displays partial states: folders without files, or files without folders", async () => {
    // Folders present, files empty
    vi.mocked(storageApi.getFoldersApi).mockImplementation(async () => mockRootFolders);
    vi.mocked(storageApi.getFilesApi).mockImplementation(async () => []);

    renderStorage();

    await waitFor(() => {
      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
      expect(screen.getByText("2 folders, 0 files")).toBeInTheDocument();
      expect(screen.queryByTestId("storage-empty")).not.toBeInTheDocument();
    });
  });

  it("8. Displays folder and file error states with Retry buttons", async () => {
    vi.mocked(storageApi.getFoldersApi).mockImplementation(async () => {
      throw new Error("Failed to fetch folders");
    });
    vi.mocked(storageApi.getFilesApi).mockImplementation(async () => {
      throw new Error("Failed to fetch files");
    });

    renderStorage();

    await waitFor(() => {
      expect(screen.getByTestId("folder-error")).toBeInTheDocument();
      expect(screen.getByTestId("file-error")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch folders")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch files")).toBeInTheDocument();
    });
  });

  it("9. Does not render Admin write or mutation controls (upload, create folder, delete)", async () => {
    vi.mocked(storageApi.getFoldersApi).mockImplementation(async () => mockRootFolders);
    vi.mocked(storageApi.getFilesApi).mockImplementation(async () => mockRootFiles);

    renderStorage();

    await waitFor(() => {
      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /create folder/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    });
  });
});
