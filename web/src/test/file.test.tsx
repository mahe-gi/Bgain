import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../context/AuthContext.js";
import { FileDetailsPage } from "../pages/FileDetailsPage.js";
import * as fileApi from "../api/file.api.js";
import type { FileItem } from "../types/storage.js";

vi.mock("../api/file.api.js", () => ({
  getFileDetailsApi: vi.fn(),
  getPreviewUrlApi: vi.fn(),
  getDownloadUrlApi: vi.fn()
}));

const mockFilePdf: FileItem = {
  id: "file-uuid-pdf",
  name: "Annual-Report-2026.pdf",
  mimeType: "application/pdf",
  sizeBytes: 10485760, // 10 MB
  folderId: "folder-uuid-1",
  uploadedById: "user-uuid-1",
  createdAt: "2026-07-20T10:00:00.000Z",
  updatedAt: "2026-07-20T10:00:00.000Z"
};

const mockFileImage: FileItem = {
  id: "file-uuid-img",
  name: "Company-Logo.png",
  mimeType: "image/png",
  sizeBytes: 524288,
  folderId: null,
  uploadedById: "user-uuid-1",
  createdAt: "2026-07-21T10:00:00.000Z",
  updatedAt: "2026-07-21T10:00:00.000Z"
};

const mockFileTxt: FileItem = {
  id: "file-uuid-txt",
  name: "Notes.txt",
  mimeType: "text/plain",
  sizeBytes: 1024,
  folderId: null,
  uploadedById: "user-uuid-1",
  createdAt: "2026-07-22T10:00:00.000Z",
  updatedAt: "2026-07-22T10:00:00.000Z"
};

const mockFileDocx: FileItem = {
  id: "file-uuid-docx",
  name: "Contract.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  sizeBytes: 204800,
  folderId: null,
  uploadedById: "user-uuid-1",
  createdAt: "2026-07-23T10:00:00.000Z",
  updatedAt: "2026-07-23T10:00:00.000Z"
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });
}

function renderFileDetails(fileId: string) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/files/${fileId}`]}>
          <Routes>
            <Route path="/files/:fileId" element={<FileDetailsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("File Details Page (Web Phase 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("1. Metadata renders correctly and storageKey is absent from DOM", async () => {
    vi.mocked(fileApi.getFileDetailsApi).mockResolvedValue(mockFilePdf);

    renderFileDetails("file-uuid-pdf");

    await waitFor(() => {
      expect(screen.getByText("Annual-Report-2026.pdf")).toBeInTheDocument();
      expect(screen.getByText("PDF Document")).toBeInTheDocument();
      expect(screen.getByText("10.0 MB")).toBeInTheDocument();
      expect(screen.getByText("application/pdf")).toBeInTheDocument();
      expect(screen.queryByText(/storageKey/i)).not.toBeInTheDocument();
    });
  });

  it("2. Displays loading state while metadata is pending", async () => {
    vi.mocked(fileApi.getFileDetailsApi).mockImplementation(() => new Promise(() => {}));

    renderFileDetails("file-uuid-pdf");

    expect(screen.getByTestId("file-details-loading")).toBeInTheDocument();
  });

  it("3. Displays error / not found state with Retry button", async () => {
    vi.mocked(fileApi.getFileDetailsApi).mockRejectedValue(new Error("File not found"));

    renderFileDetails("non-existent-uuid");

    await waitFor(() => {
      expect(screen.getByTestId("file-details-error")).toBeInTheDocument();
      expect(screen.getByText("File not found")).toBeInTheDocument();
    });
  });

  it("4. Image preview requests fresh signed URL and renders img tag", async () => {
    vi.mocked(fileApi.getFileDetailsApi).mockResolvedValue(mockFileImage);
    const getPreviewSpy = vi.mocked(fileApi.getPreviewUrlApi).mockResolvedValue({
      url: "https://r2.example.com/signed-img.png",
      expiresInSeconds: 300
    });

    renderFileDetails("file-uuid-img");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /preview file content/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /preview file content/i }));

    await waitFor(() => {
      expect(getPreviewSpy).toHaveBeenCalledWith("file-uuid-img");
      const imgEl = screen.getByAltText("Company-Logo.png");
      expect(imgEl).toBeInTheDocument();
      expect(imgEl).toHaveAttribute("src", "https://r2.example.com/signed-img.png");
    });
  });

  it("5. PDF preview renders titled iframe element with signed URL", async () => {
    vi.mocked(fileApi.getFileDetailsApi).mockResolvedValue(mockFilePdf);
    const getPreviewSpy = vi.mocked(fileApi.getPreviewUrlApi).mockResolvedValue({
      url: "https://r2.example.com/signed-pdf.pdf",
      expiresInSeconds: 300
    });

    renderFileDetails("file-uuid-pdf");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /preview file content/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /preview file content/i }));

    await waitFor(() => {
      expect(getPreviewSpy).toHaveBeenCalledWith("file-uuid-pdf");
      const iframeEl = screen.getByTitle("Annual-Report-2026.pdf");
      expect(iframeEl).toBeInTheDocument();
      expect(iframeEl).toHaveAttribute("src", "https://r2.example.com/signed-pdf.pdf");
    });
  });

  it("6. TXT preview fetches plain text and renders in escaped pre tag", async () => {
    vi.mocked(fileApi.getFileDetailsApi).mockResolvedValue(mockFileTxt);
    vi.mocked(fileApi.getPreviewUrlApi).mockResolvedValue({
      url: "https://r2.example.com/signed-notes.txt",
      expiresInSeconds: 300
    });

    // Mock unauthenticated browser fetch for plain text content
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "Hello World plain text notes content."
    } as Response);

    renderFileDetails("file-uuid-txt");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /preview file content/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /preview file content/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("https://r2.example.com/signed-notes.txt");
      expect(screen.getByText("Hello World plain text notes content.")).toBeInTheDocument();
    });
  });

  it("7. Unsupported file types (DOCX/XLSX) do not call preview endpoint and show notice", async () => {
    vi.mocked(fileApi.getFileDetailsApi).mockResolvedValue(mockFileDocx);
    const getPreviewSpy = vi.mocked(fileApi.getPreviewUrlApi);

    renderFileDetails("file-uuid-docx");

    await waitFor(() => {
      expect(screen.getByTestId("preview-unsupported")).toBeInTheDocument();
      expect(screen.getByText(/preview is not available for this file type/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /preview file content/i })).not.toBeInTheDocument();
      expect(getPreviewSpy).not.toHaveBeenCalled();
    });
  });

  it("8. Download requests fresh signed URL and triggers download", async () => {
    vi.mocked(fileApi.getFileDetailsApi).mockResolvedValue(mockFilePdf);
    const getDownloadSpy = vi.mocked(fileApi.getDownloadUrlApi).mockResolvedValue({
      url: "https://r2.example.com/download-pdf.pdf",
      expiresInSeconds: 300
    });

    renderFileDetails("file-uuid-pdf");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /download file/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /download file/i }));

    await waitFor(() => {
      expect(getDownloadSpy).toHaveBeenCalledWith("file-uuid-pdf");
    });
  });

  it("9. Displays download error state when URL generation fails", async () => {
    vi.mocked(fileApi.getFileDetailsApi).mockResolvedValue(mockFilePdf);
    vi.mocked(fileApi.getDownloadUrlApi).mockRejectedValue(new Error("Download failed"));

    renderFileDetails("file-uuid-pdf");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /download file/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /download file/i }));

    await waitFor(() => {
      expect(screen.getByTestId("download-error")).toBeInTheDocument();
      expect(screen.getByText("Download failed")).toBeInTheDocument();
    });
  });
});
