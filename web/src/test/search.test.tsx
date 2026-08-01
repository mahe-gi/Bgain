import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchPage } from "../pages/SearchPage.js";
import { StoragePage } from "../pages/StoragePage.js";
import * as searchApiModule from "../api/search.api.js";
import * as storageApiModule from "../api/storage.api.js";
import type { SearchResult } from "../types/search.js";

vi.mock("../api/search.api.js", () => ({
  searchApi: vi.fn()
}));

vi.mock("../api/storage.api.js", () => ({
  getFoldersApi: vi.fn(),
  getFilesApi: vi.fn()
}));

const mockSearchResult: SearchResult = {
  query: "report",
  folders: [
    {
      id: "folder-uuid-search",
      name: "Financial Reports",
      parentId: null,
      createdById: "user-uuid-1",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z"
    }
  ],
  files: [
    {
      id: "file-uuid-search",
      name: "Q1-Report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2097152,
      folderId: "folder-uuid-search",
      uploadedById: "user-uuid-1",
      createdAt: "2026-07-05T12:00:00.000Z",
      updatedAt: "2026-07-05T12:00:00.000Z"
    }
  ],
  total: 2
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });
}

function LocationDisplay() {
  const location = useLocation();
  return (
    <div data-testid="location-display">
      <span>{location.pathname}</span>
      <span>{JSON.stringify(location.state)}</span>
    </div>
  );
}

function renderSearch(initialEntry = "/search") {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/storage" element={<StoragePage />} />
          <Route path="/files/:fileId" element={<div>File Details Page</div>} />
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Global Search Page (Web Phase 3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Initial empty state sends no API request and displays prompt", async () => {
    const searchSpy = vi.mocked(searchApiModule.searchApi);

    renderSearch("/search");

    expect(screen.getByTestId("search-prompt")).toBeInTheDocument();
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it("2. Query shorter than two characters is rejected with client validation", async () => {
    const searchSpy = vi.mocked(searchApiModule.searchApi);

    renderSearch("/search");

    const input = screen.getByLabelText(/search files and folders/i);
    fireEvent.change(input, { target: { value: "a" } });

    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText("Search query must be between 2 and 100 characters")).toBeInTheDocument();
      expect(searchSpy).not.toHaveBeenCalled();
    });
  });

  it("3. Valid submit updates query in URL and calls searchApi", async () => {
    const searchSpy = vi.mocked(searchApiModule.searchApi).mockResolvedValue(mockSearchResult);

    renderSearch("/search");

    const input = screen.getByLabelText(/search files and folders/i);
    fireEvent.change(input, { target: { value: "report" } });

    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith("report");
      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
      expect(screen.getByText("Q1-Report.pdf")).toBeInTheDocument();
    });
  });

  it("4. Existing valid q parameter in URL automatically executes search on mount", async () => {
    const searchSpy = vi.mocked(searchApiModule.searchApi).mockResolvedValue(mockSearchResult);

    renderSearch("/search?q=report");

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith("report");
      expect(screen.getByText("2 results found for \"report\"")).toBeInTheDocument();
      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
      expect(screen.getByText("Q1-Report.pdf")).toBeInTheDocument();
    });
  });

  it("5. Displays empty results state when total is 0", async () => {
    vi.mocked(searchApiModule.searchApi).mockResolvedValue({
      query: "nonexistent",
      folders: [],
      files: [],
      total: 0
    });

    renderSearch("/search?q=nonexistent");

    await waitFor(() => {
      expect(screen.getByTestId("search-empty")).toBeInTheDocument();
      expect(screen.getByText(/no files or folders match/i)).toBeInTheDocument();
    });
  });

  it("6. Displays error state with Retry button", async () => {
    vi.mocked(searchApiModule.searchApi).mockRejectedValue(new Error("Search service offline"));

    renderSearch("/search?q=report");

    await waitFor(() => {
      expect(screen.getByTestId("search-error")).toBeInTheDocument();
      expect(screen.getByText("Search service offline")).toBeInTheDocument();
    });
  });

  it("7. Clicking folder search result opens Storage with location state", async () => {
    vi.mocked(searchApiModule.searchApi).mockResolvedValue(mockSearchResult);
    vi.mocked(storageApiModule.getFoldersApi).mockResolvedValue([]);
    vi.mocked(storageApiModule.getFilesApi).mockResolvedValue([]);

    renderSearch("/search?q=report");

    await waitFor(() => {
      expect(screen.getByText("Financial Reports")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Financial Reports"));

    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent("/storage");
    });
  });

  it("8. Clicking file search result navigates to file details page", async () => {
    vi.mocked(searchApiModule.searchApi).mockResolvedValue(mockSearchResult);

    renderSearch("/search?q=report");

    await waitFor(() => {
      expect(screen.getByText("Q1-Report.pdf")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Q1-Report.pdf"));

    await waitFor(() => {
      expect(screen.getByTestId("location-display")).toHaveTextContent("/files/file-uuid-search");
    });
  });
});
