import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage.js";
import * as dashboardApi from "../api/dashboard.api.js";
import type { DashboardData } from "../types/dashboard.js";

vi.mock("../api/dashboard.api.js", () => ({
  getDashboardApi: vi.fn()
}));

const mockDashboardData: DashboardData = {
  folderCount: 8,
  fileCount: 24,
  totalSizeBytes: 15728640, // 15 MB
  recentFiles: [
    {
      id: "file-uuid-1",
      name: "Quarterly-Report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 5242880,
      folderId: "folder-uuid-1",
      uploadedById: "user-uuid-1",
      createdAt: "2026-07-30T10:00:00.000Z",
      updatedAt: "2026-07-30T10:00:00.000Z"
    },
    {
      id: "file-uuid-2",
      name: "Architecture-Diagram.png",
      mimeType: "image/png",
      sizeBytes: 1048576,
      folderId: null,
      uploadedById: "user-uuid-1",
      createdAt: "2026-07-29T14:30:00.000Z",
      updatedAt: "2026-07-29T14:30:00.000Z"
    }
  ]
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });
}

function renderDashboard() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Dashboard Page (Web Phase 2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Renders folder count, file count and formatted storage size", async () => {
    vi.mocked(dashboardApi.getDashboardApi).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Total Folders")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("Total Files")).toBeInTheDocument();
      expect(screen.getByText("24")).toBeInTheDocument();
      expect(screen.getByText("Storage Used")).toBeInTheDocument();
      expect(screen.getByText("15.0 MB")).toBeInTheDocument();
    });
  });

  it("2. Renders recent files list with file details", async () => {
    vi.mocked(dashboardApi.getDashboardApi).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Quarterly-Report.pdf")).toBeInTheDocument();
      expect(screen.getByText("PDF Document")).toBeInTheDocument();
      expect(screen.getByText("5.0 MB")).toBeInTheDocument();

      expect(screen.getByText("Architecture-Diagram.png")).toBeInTheDocument();
      expect(screen.getByText("PNG Image")).toBeInTheDocument();
      expect(screen.getByText("1.0 MB")).toBeInTheDocument();
    });
  });

  it("3. Does not render total users metric", async () => {
    vi.mocked(dashboardApi.getDashboardApi).mockResolvedValue(mockDashboardData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("Total Folders")).toBeInTheDocument();
      expect(screen.queryByText(/total users/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/users count/i)).not.toBeInTheDocument();
    });
  });

  it("4. Shows loading skeleton while data is pending", async () => {
    vi.mocked(dashboardApi.getDashboardApi).mockImplementation(
      () => new Promise(() => {})
    );

    renderDashboard();

    expect(screen.getByTestId("dashboard-loading")).toBeInTheDocument();
  });

  it("5. Displays error state with Retry button and safe message", async () => {
    const errorMsg = "Database query timeout";
    vi.mocked(dashboardApi.getDashboardApi).mockRejectedValue(new Error(errorMsg));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-error")).toBeInTheDocument();
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });

    // Test Retry button
    vi.mocked(dashboardApi.getDashboardApi).mockResolvedValueOnce(mockDashboardData);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText("Total Folders")).toBeInTheDocument();
    });
  });

  it("6. Displays empty state when there are no recent files", async () => {
    vi.mocked(dashboardApi.getDashboardApi).mockResolvedValue({
      folderCount: 2,
      fileCount: 0,
      totalSizeBytes: 0,
      recentFiles: []
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText("No recent files uploaded yet.")).toBeInTheDocument();
    });
  });
});
