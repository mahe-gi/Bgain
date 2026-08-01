import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../context/auth-context.js";
import { UsersPage } from "../pages/UsersPage.js";
import { CreateUserDialog } from "../components/dialogs/CreateUserDialog.js";
import { AdminRoute } from "../components/auth/AdminRoute.js";
import * as userApi from "../api/user.api.js";
import type { SafeUser } from "../types/auth.js";

vi.mock("../api/user.api.js", () => ({
  getUsersApi: vi.fn(),
  createUserApi: vi.fn()
}));

const mockAdminUser: SafeUser = {
  id: "admin-uuid-123",
  name: "System Admin",
  email: "admin@example.com",
  role: "ADMIN",
  createdAt: "2026-07-01T00:00:00.000Z"
};

const mockViewerUser: SafeUser = {
  id: "viewer-uuid-456",
  name: "System Viewer",
  email: "viewer@example.com",
  role: "VIEWER",
  createdAt: "2026-07-02T00:00:00.000Z"
};

const mockUserList: SafeUser[] = [
  mockAdminUser,
  mockViewerUser
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
}

function renderUsersPage(currentUser: SafeUser | null, initialEntries = ["/users"]) {
  const queryClient = createTestQueryClient();
  const authValue = {
    user: currentUser,
    token: currentUser ? "fake-token" : null,
    isLoading: false,
    isAuthenticated: Boolean(currentUser),
    isAdmin: currentUser?.role === "ADMIN",
    login: vi.fn(),
    logout: vi.fn()
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
            <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

function renderCreateUserDialog(props: { isOpen: boolean; onClose: () => void; onSuccessMessage?: (msg: string) => void }) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateUserDialog {...props} />
    </QueryClientProvider>
  );
}

describe("Web Phase 5: Admin User Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userApi.getUsersApi).mockResolvedValue(mockUserList);
    vi.mocked(userApi.createUserApi).mockImplementation(async (payload) => ({
      id: "mock-user-id",
      name: payload.name,
      email: payload.email,
      role: payload.role,
      createdAt: "2026-07-31T00:00:00.000Z"
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("1. Admin loads and sees user list with name, email, role badge, and date", async () => {
    const getUsersSpy = vi.mocked(userApi.getUsersApi).mockResolvedValue(mockUserList);

    renderUsersPage(mockAdminUser);

    await waitFor(() => {
      expect(getUsersSpy).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText("System Admin")[0]).toBeInTheDocument();
      expect(screen.getAllByText("admin@example.com")[0]).toBeInTheDocument();
      expect(screen.getAllByText("System Viewer")[0]).toBeInTheDocument();
      expect(screen.getAllByText("viewer@example.com")[0]).toBeInTheDocument();
      expect(screen.getByText("2 users registered")).toBeInTheDocument();
    });
  });

  it("2. Password and passwordHash are never rendered in DOM", async () => {
    vi.mocked(userApi.getUsersApi).mockResolvedValue(mockUserList);

    renderUsersPage(mockAdminUser);

    await waitFor(() => {
      expect(screen.getAllByText("System Admin")[0]).toBeInTheDocument();
    });

    expect(screen.queryByText(/passwordHash/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/secret/i)).not.toBeInTheDocument();
  });

  it("3. Displays loading skeleton state while users query is pending", async () => {
    vi.mocked(userApi.getUsersApi).mockImplementation(() => new Promise(() => {}));

    renderUsersPage(mockAdminUser);

    expect(screen.getByTestId("users-loading")).toBeInTheDocument();
  });

  it("4. Displays error state with Retry button on API failure", async () => {
    vi.mocked(userApi.getUsersApi).mockRejectedValue(new Error("Failed to fetch users"));

    renderUsersPage(mockAdminUser);

    await waitFor(() => {
      expect(screen.getByTestId("users-error")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch users")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry users/i })).toBeInTheDocument();
    });
  });

  it("5. Displays empty state when 0 users exist", async () => {
    vi.mocked(userApi.getUsersApi).mockResolvedValue([]);

    renderUsersPage(mockAdminUser);

    await waitFor(() => {
      expect(screen.getByTestId("users-empty")).toBeInTheDocument();
      expect(screen.getByText("No users found")).toBeInTheDocument();
    });
  });

  it("6. Create User dialog opens with default VIEWER role", async () => {
    vi.mocked(userApi.getUsersApi).mockResolvedValue(mockUserList);

    renderUsersPage(mockAdminUser);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create new user account/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /create new user account/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /create new user/i })).toBeInTheDocument();
      const roleSelect = screen.getByLabelText(/role/i) as HTMLSelectElement;
      expect(roleSelect.value).toBe("VIEWER");
    });
  });

  it("7. Validates required fields, invalid email format, and password length (8-72 chars)", async () => {
    const onClose = vi.fn();
    renderCreateUserDialog({ isOpen: true, onClose });

    const dialog = screen.getByRole("dialog", { name: /create new user/i });
    const nameInput = within(dialog).getByLabelText(/full name/i);
    const emailInput = within(dialog).getByLabelText(/email address/i);
    const passwordInput = within(dialog).getByLabelText(/password/i);
    const submitBtn = screen.getByTestId("create-user-submit-btn");

    // Empty submission validation
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(within(dialog).getByText(/full name must be between 2 and 100 characters/i)).toBeInTheDocument();
    });

    // Invalid email validation
    fireEvent.change(nameInput, { target: { value: "Alex Morgan" } });
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(within(dialog).getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });

    // Password shorter than 8 chars
    fireEvent.change(emailInput, { target: { value: "alex@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(within(dialog).getByText(/password must be between 8 and 72 characters/i)).toBeInTheDocument();
    });

    // Password longer than 72 chars
    fireEvent.change(passwordInput, { target: { value: "a".repeat(73) } });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(within(dialog).getByText(/password must be between 8 and 72 characters/i)).toBeInTheDocument();
    });

    expect(userApi.createUserApi).not.toHaveBeenCalled();
  });

  it("8. Submits valid VIEWER user payload with trimmed and lowercased email", async () => {
    const onClose = vi.fn();
    const createSpy = vi.mocked(userApi.createUserApi);

    renderCreateUserDialog({ isOpen: true, onClose });

    const dialog = screen.getByRole("dialog", { name: /create new user/i });
    const nameInput = within(dialog).getByLabelText(/full name/i);
    const emailInput = within(dialog).getByLabelText(/email address/i);
    const passwordInput = within(dialog).getByLabelText(/password/i);

    fireEvent.change(nameInput, { target: { value: "  Alex Morgan  " } });
    fireEvent.change(emailInput, { target: { value: "  Alex@Example.COM  " } });
    fireEvent.change(passwordInput, { target: { value: "secretpass123" } });

    fireEvent.click(screen.getByTestId("create-user-submit-btn"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: "Alex Morgan",
        email: "alex@example.com",
        password: "secretpass123",
        role: "VIEWER"
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("9. Submits valid ADMIN creation when ADMIN role is selected", async () => {
    const onClose = vi.fn();
    const createSpy = vi.mocked(userApi.createUserApi);

    renderCreateUserDialog({ isOpen: true, onClose });

    const dialog = screen.getByRole("dialog", { name: /create new user/i });
    const nameInput = within(dialog).getByLabelText(/full name/i);
    const emailInput = within(dialog).getByLabelText(/email address/i);
    const passwordInput = within(dialog).getByLabelText(/password/i);
    const roleSelect = within(dialog).getByLabelText(/role/i);

    fireEvent.change(nameInput, { target: { value: "Taylor Admin" } });
    fireEvent.change(emailInput, { target: { value: "taylor@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "adminpass123" } });
    fireEvent.change(roleSelect, { target: { value: "ADMIN" } });

    fireEvent.click(screen.getByTestId("create-user-submit-btn"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: "Taylor Admin",
        email: "taylor@example.com",
        password: "adminpass123",
        role: "ADMIN"
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("10. Duplicate email error stays visible inside open dialog", async () => {
    const onClose = vi.fn();
    const createSpy = vi.mocked(userApi.createUserApi).mockRejectedValue(new Error("EMAIL_ALREADY_EXISTS"));

    renderCreateUserDialog({ isOpen: true, onClose });

    const dialog = screen.getByRole("dialog", { name: /create new user/i });
    const nameInput = within(dialog).getByLabelText(/full name/i);
    const emailInput = within(dialog).getByLabelText(/email address/i);
    const passwordInput = within(dialog).getByLabelText(/password/i);

    fireEvent.change(nameInput, { target: { value: "Alex Morgan" } });
    fireEvent.change(emailInput, { target: { value: "duplicate@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "secretpass123" } });

    fireEvent.click(screen.getByTestId("create-user-submit-btn"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(within(dialog).getByText(/EMAIL_ALREADY_EXISTS/i)).toBeInTheDocument();
    });
  });

  it("11. Password field is cleared after dialog closes and reopens", async () => {
    const { rerender } = renderCreateUserDialog({ isOpen: true, onClose: vi.fn() });

    let dialog = screen.getByRole("dialog", { name: /create new user/i });
    const pwdInput = within(dialog).getByLabelText(/password/i) as HTMLInputElement;

    fireEvent.change(pwdInput, { target: { value: "supersecret123" } });
    expect(pwdInput.value).toBe("supersecret123");

    // Close dialog
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <CreateUserDialog isOpen={false} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Re-open dialog
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <CreateUserDialog isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>
    );

    dialog = screen.getByRole("dialog", { name: /create new user/i });
    const reopenedPwdInput = within(dialog).getByLabelText(/password/i) as HTMLInputElement;
    expect(reopenedPwdInput.value).toBe("");
  });

  it("12. Viewer user is redirected/blocked from /users by AdminRoute and getUsersApi is never called", async () => {
    const getUsersSpy = vi.mocked(userApi.getUsersApi);

    renderUsersPage(mockViewerUser, ["/users"]);

    await waitFor(() => {
      expect(screen.getByText("403 - Access Denied")).toBeInTheDocument();
      expect(getUsersSpy).not.toHaveBeenCalled();
    });
  });
});
