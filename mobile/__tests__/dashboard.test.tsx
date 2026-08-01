import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Keychain from 'react-native-keychain';
import { AuthProvider } from '../src/context/AuthProvider';
import { DashboardScreen } from '../src/screens/DashboardScreen';
import * as dashboardApi from '../src/api/dashboard.api';
import * as authApi from '../src/api/auth.api';
import type { DashboardData } from '../src/types/dashboard';
import type { SafeUser } from '../src/types/auth';

jest.mock('../src/api/dashboard.api', () => ({
  getDashboardApi: jest.fn(),
}));

jest.mock('../src/api/auth.api', () => ({
  loginApi: jest.fn(),
  getMeApi: jest.fn(),
}));

// Mock Navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockAdminUser: SafeUser = {
  id: 'admin-uuid-1',
  name: 'System Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  createdAt: '2026-07-01T10:00:00.000Z',
};

const mockDashboardData: DashboardData = {
  folderCount: 8,
  fileCount: 24,
  totalSizeBytes: 15728640, // 15 MB
  recentFiles: [
    {
      id: 'file-1-uuid',
      name: 'Financial_Report_Q2.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 5242880, // 5 MB
      folderId: 'folder-root-uuid',
      uploadedById: 'admin-uuid-1',
      createdAt: '2026-08-01T12:00:00.000Z',
      updatedAt: '2026-08-01T12:00:00.000Z',
    },
  ],
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderWithAuthProvider(ui: React.ReactNode) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('Mobile Dashboard Phase 2 Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
      username: 'auth_token',
      password: 'valid-jwt-token',
      service: 'com.securestoragemobile.auth',
    } as Keychain.UserCredentials);
    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockAdminUser });
  });

  it('1. Dashboard renders live storage metrics (Storage Used, Folders, Files)', async () => {
    jest.spyOn(dashboardApi, 'getDashboardApi').mockResolvedValue(mockDashboardData);

    renderWithAuthProvider(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('stat-storage-used')).toBeTruthy();
      expect(screen.getByText('15.0 MB')).toBeTruthy();
      expect(screen.getByText('8')).toBeTruthy();
      expect(screen.getByText('24')).toBeTruthy();
    });
  });

  it('2. Dashboard renders recent files section with filename, type, size, and date', async () => {
    jest.spyOn(dashboardApi, 'getDashboardApi').mockResolvedValue(mockDashboardData);

    renderWithAuthProvider(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText('Financial_Report_Q2.pdf')).toBeTruthy();
      expect(screen.getByText(/PDF Document/i)).toBeTruthy();
      expect(screen.getAllByText(/5.0 MB/i).length).toBeGreaterThan(0);
    });
  });

  it('3. Dashboard renders an empty recent-files state when recentFiles array is empty', async () => {
    jest.spyOn(dashboardApi, 'getDashboardApi').mockResolvedValue({
      folderCount: 0,
      fileCount: 0,
      totalSizeBytes: 0,
      recentFiles: [],
    });

    renderWithAuthProvider(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('recent-files-empty')).toBeTruthy();
      expect(screen.getByText('No recent files stored in Gateway.')).toBeTruthy();
    });
  });

  it('4. Dashboard loading state is visible while fetching data', async () => {
    jest.spyOn(dashboardApi, 'getDashboardApi').mockImplementation(() => new Promise(() => {}));

    renderWithAuthProvider(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText('Loading Dashboard...')).toBeTruthy();
    });
  });

  it('5. Dashboard error state provides Retry action on API failure', async () => {
    const dashSpy = jest
      .spyOn(dashboardApi, 'getDashboardApi')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockDashboardData);

    renderWithAuthProvider(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Dashboard')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Retry'));
    });

    await waitFor(() => {
      expect(dashSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('15.0 MB')).toBeTruthy();
    });
  });

  it('6. Browse Storage button navigates to Storage tab with resetToRoot: true', async () => {
    jest.spyOn(dashboardApi, 'getDashboardApi').mockResolvedValue(mockDashboardData);

    renderWithAuthProvider(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText('Browse Storage')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Browse Storage'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('Storage', { resetToRoot: true });
  });

  it('7. Dashboard UI never renders secret tokens, passwordHash, or internal keys', async () => {
    jest.spyOn(dashboardApi, 'getDashboardApi').mockResolvedValue(mockDashboardData);

    renderWithAuthProvider(<DashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText('Financial_Report_Q2.pdf')).toBeTruthy();
      expect(screen.queryByText(/passwordHash/i)).toBeNull();
      expect(screen.queryByText(/jwt/i)).toBeNull();
      expect(screen.queryByText(/secret/i)).toBeNull();
    });
  });
});
