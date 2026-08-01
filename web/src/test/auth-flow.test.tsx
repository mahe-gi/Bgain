import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../context/AuthContext.js";
import { ProtectedRoute } from "../components/auth/ProtectedRoute.js";
import { AdminRoute } from "../components/auth/AdminRoute.js";
import { AppShell } from "../components/layout/AppShell.js";
import { LoginPage } from "../pages/LoginPage.js";
import { DashboardPage } from "../pages/DashboardPage.js";
import { UsersPage } from "../pages/UsersPage.js";
import * as authApi from "../api/auth.api.js";
import { SafeUser } from "../types/auth.js";

const mockAdminUser: SafeUser = {
  id: "admin-uuid-1",
  name: "Demo Admin",
  email: "admin@example.com",
  role: "ADMIN",
  createdAt: "2026-01-01T00:00:00.000Z"
};

const mockViewerUser: SafeUser = {
  id: "viewer-uuid-2",
  name: "Demo Viewer",
  email: "viewer@example.com",
  role: "VIEWER",
  createdAt: "2026-01-01T00:00:00.000Z"
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });
}

function renderWithAuth(initialEntries = ["/dashboard"]) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
            </Route>
            <Route element={<AdminRoute />}>
              <Route element={<AppShell />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Web Phase 1 Auth & Routing Tests", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(authApi, "getMeApi").mockRejectedValue(new Error("No active session"));
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("1. Unauthenticated user accessing protected route /dashboard is redirected to /login", async () => {
    renderWithAuth(["/dashboard"]);

    await waitFor(() => {
      expect(screen.getByText("Sign in to access your storage management system")).toBeInTheDocument();
    });
  });

  it("2. Login required-field validation shows error if fields are empty", async () => {
    renderWithAuth(["/login"]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Please fill in all required fields")).toBeInTheDocument();
    });
  });

  it("3. Successful login stores token in sessionStorage and redirects to /dashboard", async () => {
    const loginSpy = vi.spyOn(authApi, "loginApi").mockResolvedValue({
      accessToken: "fake-admin-token",
      user: mockAdminUser
    });

    renderWithAuth(["/login"]);

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "AdminPassword123!" } });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith("admin@example.com", "AdminPassword123!");
      expect(sessionStorage.getItem("accessToken")).toBe("fake-admin-token");
      expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
      expect(screen.getByText("Demo Admin")).toBeInTheDocument();
    });
  });

  it("4. Invalid login displays backend-safe error message", async () => {
    vi.spyOn(authApi, "loginApi").mockRejectedValue(new Error("Invalid email or password"));

    renderWithAuth(["/login"]);

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "wrong@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrongpassword" } });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });
  });

  it("5. Session restoration retrieves user profile via getMeApi on startup", async () => {
    sessionStorage.setItem("accessToken", "existing-valid-token");
    vi.spyOn(authApi, "getMeApi").mockResolvedValue({
      user: mockAdminUser
    });

    renderWithAuth(["/dashboard"]);

    await waitFor(() => {
      expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
      expect(screen.getByText("Demo Admin")).toBeInTheDocument();
      expect(screen.getByText("ADMIN")).toBeInTheDocument();
    });
  });

  it("6. Viewer user navigating to /users is rejected with 403 Forbidden page", async () => {
    sessionStorage.setItem("accessToken", "viewer-token");
    vi.spyOn(authApi, "getMeApi").mockResolvedValue({
      user: mockViewerUser
    });

    renderWithAuth(["/users"]);

    await waitFor(() => {
      expect(screen.getByText("403 - Access Denied")).toBeInTheDocument();
    });
  });

  it("7. Admin user navigating to /users is granted access", async () => {
    sessionStorage.setItem("accessToken", "admin-token");
    vi.spyOn(authApi, "getMeApi").mockResolvedValue({
      user: mockAdminUser
    });

    renderWithAuth(["/users"]);

    await waitFor(() => {
      expect(screen.getAllByText("User Management").length).toBeGreaterThan(0);
      expect(screen.getByText("Demo Admin")).toBeInTheDocument();
    });
  });

  it("8. Users navigation link is visible only to Admin and hidden from Viewer", async () => {
    sessionStorage.setItem("accessToken", "viewer-token");
    vi.spyOn(authApi, "getMeApi").mockResolvedValue({
      user: mockViewerUser
    });

    renderWithAuth(["/dashboard"]);

    await waitFor(() => {
      expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
      expect(screen.queryByText("Users")).not.toBeInTheDocument();
    });
  });

  it("9. Logout clears token from sessionStorage and resets auth state", async () => {
    sessionStorage.setItem("accessToken", "admin-token");
    vi.spyOn(authApi, "getMeApi").mockResolvedValue({
      user: mockAdminUser
    });

    renderWithAuth(["/dashboard"]);

    await waitFor(() => {
      expect(screen.getByText("Demo Admin")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem("accessToken")).toBeNull();
      expect(screen.getByText("Sign in to access your storage management system")).toBeInTheDocument();
    });
  });
});
