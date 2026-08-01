import React from 'react';
import { render, waitFor, screen } from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/context/AuthProvider';
import { RootNavigator } from '../src/navigation/RootNavigator';
import * as authApi from '../src/api/auth.api';
import type { SafeUser } from '../src/types/auth';

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

function renderRootApp() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Mobile Navigation Role Matrix Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('8. Viewer navigation includes Home, Storage, Search, Profile and EXCLUDES Users tab', async () => {
    jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
      username: 'auth_token',
      password: 'viewer-valid-token',
      service: 'com.securestoragemobile.auth',
    } as Keychain.UserCredentials);

    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockViewerUser });

    renderRootApp();

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getByText('Storage')).toBeTruthy();
      expect(screen.getByText('Search')).toBeTruthy();
      expect(screen.getByText('Profile')).toBeTruthy();
      expect(screen.queryByText('Users')).toBeNull();
    });
  });

  it('9. Admin navigation includes Home, Storage, Search, Users, and Profile tabs', async () => {
    jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
      username: 'auth_token',
      password: 'admin-valid-token',
      service: 'com.securestoragemobile.auth',
    } as Keychain.UserCredentials);

    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockAdminUser });

    renderRootApp();

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
      expect(screen.getByText('Storage')).toBeTruthy();
      expect(screen.getByText('Search')).toBeTruthy();
      expect(screen.getByText('Users')).toBeTruthy();
      expect(screen.getByText('Profile')).toBeTruthy();
    });
  });
});
