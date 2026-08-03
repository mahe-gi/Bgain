import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../src/context/auth-context';
import { UsersScreen } from '../src/screens/UsersScreen';
import * as usersApi from '../src/api/users.api';
import type { SafeUser, AuthContextValue } from '../src/types/auth';

jest.mock('../src/api/users.api', () => ({
  getUsersApi: jest.fn(),
  createUserApi: jest.fn(),
}));

const mockAdminUser: SafeUser = {
  id: 'admin-1',
  name: 'System Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  createdAt: '2026-07-01T10:00:00.000Z',
};

const mockViewerUser: SafeUser = {
  id: 'viewer-2',
  name: 'Jane Viewer',
  email: 'jane@example.com',
  role: 'VIEWER',
  createdAt: '2026-07-02T12:00:00.000Z',
};

const mockUsersList: SafeUser[] = [mockAdminUser, mockViewerUser];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderUsersScreen(user: SafeUser = mockAdminUser) {
  const queryClient = createTestQueryClient();
  const authValue: AuthContextValue = {
    status: 'authenticated',
    user,
    login: jest.fn(),
    logout: jest.fn(),
    error: null,
    clearError: jest.fn(),
  };

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <UsersScreen />
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe('Mobile Admin User Management Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. Loading state renders skeleton loading cards', async () => {
    (usersApi.getUsersApi as jest.Mock).mockReturnValue(new Promise(() => {}));

    renderUsersScreen();

    expect(screen.getByTestId('users-loading')).toBeTruthy();
  });

  it('2. Successful user list renders all registered users with name, email, role badge, initials, and date', async () => {
    (usersApi.getUsersApi as jest.Mock).mockResolvedValue(mockUsersList);

    renderUsersScreen();

    await waitFor(() => {
      expect(screen.getByTestId('user-item-admin-1')).toBeTruthy();
      expect(screen.getByTestId('user-item-viewer-2')).toBeTruthy();
      expect(screen.getByText('System Admin')).toBeTruthy();
      expect(screen.getByText('admin@example.com')).toBeTruthy();
      expect(screen.getByText('Jane Viewer')).toBeTruthy();
      expect(screen.getByText('jane@example.com')).toBeTruthy();
      expect(screen.getByText('ADMIN')).toBeTruthy();
      expect(screen.getByText('VIEWER')).toBeTruthy();
      expect(screen.getByText('SA')).toBeTruthy();
      expect(screen.getByText('JV')).toBeTruthy();
      expect(screen.getByText('2 users registered')).toBeTruthy();
    });
  });

  it('3. Error state displays safe message and Retry button fetches users again', async () => {
    (usersApi.getUsersApi as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error loading users'))
      .mockResolvedValueOnce(mockUsersList);

    renderUsersScreen();

    await waitFor(() => {
      expect(screen.getByTestId('users-error')).toBeTruthy();
      expect(screen.getByText('Network error loading users')).toBeTruthy();
    });

    const retryBtn = screen.getByTestId('btn-retry-users');
    await act(async () => {
      fireEvent.press(retryBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('System Admin')).toBeTruthy();
      expect(usersApi.getUsersApi).toHaveBeenCalledTimes(2);
    });
  });

  it('4. Opening and closing the Create User modal toggles visibility', async () => {
    (usersApi.getUsersApi as jest.Mock).mockResolvedValue(mockUsersList);

    renderUsersScreen();

    await waitFor(() => {
      expect(screen.getByText('System Admin')).toBeTruthy();
    });

    // Open modal
    fireEvent.press(screen.getByTestId('btn-open-create-user'));

    await waitFor(() => {
      expect(screen.getByTestId('modal-create-user')).toBeTruthy();
      expect(screen.getByText('Create New User')).toBeTruthy();
    });

    // Close modal
    fireEvent.press(screen.getByTestId('btn-cancel-create-user'));

    await waitFor(() => {
      expect(screen.queryByTestId('modal-create-user')).toBeNull();
    });
  });

  it('5. Field validation blocks submission and displays field errors when inputs are invalid', async () => {
    (usersApi.getUsersApi as jest.Mock).mockResolvedValue(mockUsersList);

    renderUsersScreen();

    await waitFor(() => {
      expect(screen.getByText('System Admin')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('btn-open-create-user'));

    await waitFor(() => {
      expect(screen.getByTestId('modal-create-user')).toBeTruthy();
    });

    // Enter invalid inputs
    fireEvent.changeText(screen.getByTestId('input-user-name'), 'A');
    fireEvent.changeText(screen.getByTestId('input-user-email'), 'invalid-email');
    fireEvent.changeText(screen.getByTestId('input-user-password'), 'short');

    // Blur inputs to trigger touched errors
    fireEvent(screen.getByTestId('input-user-name'), 'blur');
    fireEvent(screen.getByTestId('input-user-email'), 'blur');
    fireEvent(screen.getByTestId('input-user-password'), 'blur');

    await waitFor(() => {
      expect(screen.getByTestId('error-user-name')).toBeTruthy();
      expect(screen.getByTestId('error-user-email')).toBeTruthy();
      expect(screen.getByTestId('error-user-password')).toBeTruthy();
      expect(screen.getByTestId('btn-submit-create-user').props.accessibilityState.disabled).toBe(true);
      expect(usersApi.createUserApi).not.toHaveBeenCalled();
    });
  });

  it('6. Successful user creation submits payload, closes modal, shows success banner, and refetches query', async () => {
    (usersApi.getUsersApi as jest.Mock).mockResolvedValue(mockUsersList);
    const newUser: SafeUser = {
      id: 'admin-3',
      name: 'Alice Admin',
      email: 'alice@example.com',
      role: 'ADMIN',
      createdAt: '2026-08-03T10:00:00.000Z',
    };
    (usersApi.createUserApi as jest.Mock).mockResolvedValue(newUser);

    renderUsersScreen();

    await waitFor(() => {
      expect(screen.getByText('System Admin')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('btn-open-create-user'));

    await waitFor(() => {
      expect(screen.getByTestId('modal-create-user')).toBeTruthy();
    });

    // Fill valid form
    fireEvent.changeText(screen.getByTestId('input-user-name'), 'Alice Admin');
    fireEvent.changeText(screen.getByTestId('input-user-email'), 'alice@example.com');
    fireEvent.changeText(screen.getByTestId('input-user-password'), 'Password123!');
    fireEvent.press(screen.getByTestId('role-option-admin'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-create-user'));
    });

    await waitFor(() => {
      expect(usersApi.createUserApi).toHaveBeenCalledWith({
        name: 'Alice Admin',
        email: 'alice@example.com',
        password: 'Password123!',
        role: 'ADMIN',
      });
      expect(screen.queryByTestId('modal-create-user')).toBeNull();
      expect(screen.getByTestId('users-success-banner')).toBeTruthy();
      expect(screen.getByText('User "Alice Admin" created successfully.')).toBeTruthy();
    });
  });

  it('7. Backend conflict error displays safe error message without exposing internal details', async () => {
    (usersApi.getUsersApi as jest.Mock).mockResolvedValue(mockUsersList);
    (usersApi.createUserApi as jest.Mock).mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { error: { code: 'CONFLICT', message: 'A user with this email already exists.' } },
      },
    });

    renderUsersScreen();

    await waitFor(() => {
      expect(screen.getByText('System Admin')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('btn-open-create-user'));

    await waitFor(() => {
      expect(screen.getByTestId('modal-create-user')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('input-user-name'), 'Existing User');
    fireEvent.changeText(screen.getByTestId('input-user-email'), 'admin@example.com');
    fireEvent.changeText(screen.getByTestId('input-user-password'), 'Password123!');

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-create-user'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('create-user-error')).toBeTruthy();
      expect(screen.getByText('A user with this email already exists.')).toBeTruthy();
      expect(screen.getByTestId('modal-create-user')).toBeTruthy();
    });
  });

  it('8. Double-submit prevention disables controls while request is pending', async () => {
    (usersApi.getUsersApi as jest.Mock).mockResolvedValue(mockUsersList);
    let resolveCreate: (val: SafeUser) => void = () => {};
    (usersApi.createUserApi as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );

    renderUsersScreen();

    await waitFor(() => {
      expect(screen.getByText('System Admin')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('btn-open-create-user'));

    await waitFor(() => {
      expect(screen.getByTestId('modal-create-user')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('input-user-name'), 'Bob Admin');
    fireEvent.changeText(screen.getByTestId('input-user-email'), 'bob@example.com');
    fireEvent.changeText(screen.getByTestId('input-user-password'), 'Password123!');

    // First submit press
    act(() => {
      fireEvent.press(screen.getByTestId('btn-submit-create-user'));
    });

    // Verify controls are disabled while pending
    expect(screen.getByTestId('input-user-name').props.editable).toBe(false);
    expect(screen.getByTestId('input-user-email').props.editable).toBe(false);
    expect(screen.getByTestId('input-user-password').props.editable).toBe(false);
    expect(screen.getByTestId('btn-submit-create-user').props.accessibilityState.disabled).toBe(true);

    // Second submit press should be ignored
    act(() => {
      fireEvent.press(screen.getByTestId('btn-submit-create-user'));
    });

    expect(usersApi.createUserApi).toHaveBeenCalledTimes(1);

    // Resolve pending request
    await act(async () => {
      resolveCreate({
        id: 'admin-4',
        name: 'Bob Admin',
        email: 'bob@example.com',
        role: 'VIEWER',
        createdAt: '2026-08-03T10:00:00.000Z',
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('modal-create-user')).toBeNull();
    });
  });

  it('9. Viewer restriction displays access restricted view and skips API fetch', async () => {
    renderUsersScreen(mockViewerUser);

    await waitFor(() => {
      expect(screen.getByTestId('users-viewer-restricted')).toBeTruthy();
      expect(screen.getByText('Access Restricted')).toBeTruthy();
      expect(screen.getByText('Admin privileges are required to view and manage user accounts.')).toBeTruthy();
      expect(screen.queryByTestId('btn-open-create-user')).toBeNull();
      expect(usersApi.getUsersApi).not.toHaveBeenCalled();
    });
  });
});
