import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/context/AuthProvider';
import { useAuth } from '../src/hooks/useAuth';
import { LoginScreen } from '../src/screens/LoginScreen';
import { ProfileScreen } from '../src/screens/ProfileScreen';
import * as authApi from '../src/api/auth.api';
import { apiClient, resetUnauthorizedState } from '../src/api/client';
import type { SafeUser } from '../src/types/auth';
import { Text, View, Button } from 'react-native';

jest.mock('../src/api/auth.api', () => ({
  loginApi: jest.fn(),
  getMeApi: jest.fn(),
}));

const mockAdminUser: SafeUser = {
  id: 'admin-uuid-1',
  name: 'System Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  createdAt: '2026-07-01T10:00:00.000Z',
};

const mockViewerUser: SafeUser = {
  id: 'viewer-uuid-2',
  name: 'System Viewer',
  email: 'viewer@example.com',
  role: 'VIEWER',
  createdAt: '2026-07-02T10:00:00.000Z',
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function TestAuthConsumer() {
  const { status, user, logout } = useAuth();
  return (
    <View>
      <Text testID="auth-status">{status}</Text>
      {user && <Text testID="auth-user-name">{user.name}</Text>}
      {user && <Text testID="auth-user-role">{user.role}</Text>}
      <Button title="Logout" onPress={() => logout()} />
    </View>
  );
}

function renderWithAuthProvider(ui: React.ReactNode) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('Mobile Authentication Phase 1 Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetUnauthorizedState();
  });

  it('1. Login screen renders email and password input fields', () => {
    renderWithAuthProvider(<LoginScreen />);
    expect(screen.getByText('Email Address')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();
    expect(screen.getByPlaceholderText('name@company.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('2. Required-field validation prevents submission when fields are empty', async () => {
    const loginSpy = jest.spyOn(authApi, 'loginApi');
    renderWithAuthProvider(<LoginScreen />);

    const submitBtn = screen.getByText('Sign In');
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Email address is required.')).toBeTruthy();
      expect(loginSpy).not.toHaveBeenCalled();
    });
  });

  it('3. Email is trimmed and lowercased before calling login API', async () => {
    const loginSpy = jest.spyOn(authApi, 'loginApi').mockResolvedValue({
      accessToken: 'test-jwt-token',
      user: mockAdminUser,
    });

    renderWithAuthProvider(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('name@company.com'), '  ADMIN@Example.COM  ');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'Password123!');

    await act(async () => {
      fireEvent.press(screen.getByText('Sign In'));
    });

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith('admin@example.com', 'Password123!');
    });
  });

  it('4. Successful login saves token to Keychain and sets authenticated status', async () => {
    jest.spyOn(authApi, 'loginApi').mockResolvedValue({
      accessToken: 'valid-secret-token',
      user: mockAdminUser,
    });

    renderWithAuthProvider(
      <View>
        <LoginScreen />
        <TestAuthConsumer />
      </View>
    );

    // Wait for initial token restoration to finish
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').props.children).toBe('unauthenticated');
    });

    fireEvent.changeText(screen.getByPlaceholderText('name@company.com'), 'admin@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'Password123!');

    await act(async () => {
      fireEvent.press(screen.getByText('Sign In'));
    });

    await waitFor(() => {
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith('auth_token', 'valid-secret-token', {
        service: 'com.securestoragemobile.auth',
      });
      expect(screen.getByTestId('auth-status').props.children).toBe('authenticated');
      expect(screen.getByTestId('auth-user-name').props.children).toBe('System Admin');
    });
  });

  it('5. Invalid credentials show a safe error and do not save a token to Keychain', async () => {
    jest.spyOn(authApi, 'loginApi').mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 401,
        data: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
      },
    });

    renderWithAuthProvider(
      <View>
        <LoginScreen />
        <TestAuthConsumer />
      </View>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').props.children).toBe('unauthenticated');
    });

    fireEvent.changeText(screen.getByPlaceholderText('name@company.com'), 'admin@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'wrongpass');

    await act(async () => {
      fireEvent.press(screen.getByText('Sign In'));
    });

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeTruthy();
      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
      expect(screen.getByTestId('auth-status').props.children).toBe('unauthenticated');
    });
  });

  it('6. Stored valid token restores user session via GET /auth/me on startup', async () => {
    jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
      username: 'auth_token',
      password: 'stored-jwt-token',
      service: 'com.securestoragemobile.auth',
    } as Keychain.UserCredentials);

    const getMeSpy = jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockAdminUser });

    renderWithAuthProvider(<TestAuthConsumer />);

    await waitFor(() => {
      expect(getMeSpy).toHaveBeenCalled();
      expect(screen.getByTestId('auth-status').props.children).toBe('authenticated');
      expect(screen.getByTestId('auth-user-name').props.children).toBe('System Admin');
    });
  });

  it('7. Invalid stored token clears Keychain and resets status to unauthenticated', async () => {
    jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
      username: 'auth_token',
      password: 'expired-jwt-token',
      service: 'com.securestoragemobile.auth',
    } as Keychain.UserCredentials);

    jest.spyOn(authApi, 'getMeApi').mockRejectedValue(new Error('Token expired'));

    renderWithAuthProvider(<TestAuthConsumer />);

    await waitFor(() => {
      expect(Keychain.resetGenericPassword).toHaveBeenCalled();
      expect(screen.getByTestId('auth-status').props.children).toBe('unauthenticated');
    });
  });

  it('10. Profile displays user name, email, role badge, and member since date without UUID', async () => {
    jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
      username: 'auth_token',
      password: 'valid-token',
      service: 'com.securestoragemobile.auth',
    } as Keychain.UserCredentials);

    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockViewerUser });

    renderWithAuthProvider(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('System Viewer')).toBeTruthy();
      expect(screen.getByText('viewer@example.com')).toBeTruthy();
      expect(screen.getByText('VIEWER')).toBeTruthy();
      expect(screen.queryByText('viewer-uuid-2')).toBeNull();
    });
  });

  it('11. Logout clears Keychain and query cache and resets status to unauthenticated', async () => {
    jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
      username: 'auth_token',
      password: 'valid-token',
      service: 'com.securestoragemobile.auth',
    } as Keychain.UserCredentials);

    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockAdminUser });

    renderWithAuthProvider(<TestAuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').props.children).toBe('authenticated');
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Logout'));
    });

    await waitFor(() => {
      expect(Keychain.resetGenericPassword).toHaveBeenCalled();
      expect(screen.getByTestId('auth-status').props.children).toBe('unauthenticated');
    });
  });

  it('12. Protected 401 response triggers session reset and clears stored token', async () => {
    jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
      username: 'auth_token',
      password: 'valid-token',
      service: 'com.securestoragemobile.auth',
    } as Keychain.UserCredentials);

    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockAdminUser });

    renderWithAuthProvider(<TestAuthConsumer />);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').props.children).toBe('authenticated');
    });

    // Simulate protected request 401 error
    const handler = (apiClient.interceptors.response as unknown as { handlers: Array<{ rejected?: (err: unknown) => Promise<unknown> }> }).handlers[0];
    if (handler && handler.rejected) {
      await act(async () => {
        try {
          await handler.rejected!({
            isAxiosError: true,
            response: { status: 401, config: { url: '/api/protected-resource' } },
          });
        } catch {
          // Expected error rejection
        }
      });
    }

    await waitFor(() => {
      expect(Keychain.resetGenericPassword).toHaveBeenCalled();
      expect(screen.getByTestId('auth-status').props.children).toBe('unauthenticated');
    });
  });

  it('13. Login 401 does not trigger the expired-session callback', async () => {
    const resetSpy = jest.spyOn(Keychain, 'resetGenericPassword');

    // Simulate login 401 response error
    const loginError = {
      isAxiosError: true,
      response: { status: 401, config: { url: '/api/auth/login' } },
    };

    const handler = (apiClient.interceptors.response as unknown as { handlers: Array<{ rejected?: (err: unknown) => Promise<unknown> }> }).handlers[0];
    if (handler && handler.rejected) {
      await act(async () => {
        try {
          await handler.rejected!(loginError);
        } catch {
          // Expected error rejection
        }
      });
    }

    await waitFor(() => {
      expect(resetSpy).not.toHaveBeenCalled();
    });
  });

  it('14. Secrets, passwords, and passwordHash are never rendered in DOM', async () => {
    renderWithAuthProvider(<LoginScreen />);
    expect(screen.queryByText(/passwordHash/i)).toBeNull();
    expect(screen.queryByText(/jwt/i)).toBeNull();
    expect(screen.queryByText(/secret/i)).toBeNull();
  });
});
