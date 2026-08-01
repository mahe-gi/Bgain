import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Keychain from 'react-native-keychain';
import { AuthProvider } from '../src/context/AuthProvider';
import { StorageScreen } from '../src/screens/StorageScreen';
import * as storageApi from '../src/api/storage.api';
import * as authApi from '../src/api/auth.api';
import type { SafeFolder, SafeFile } from '../src/types/storage';
import type { SafeUser } from '../src/types/auth';

jest.mock('../src/api/storage.api', () => ({
  getFoldersApi: jest.fn(),
  getFilesApi: jest.fn(),
}));

jest.mock('../src/api/auth.api', () => ({
  loginApi: jest.fn(),
  getMeApi: jest.fn(),
}));

// Mock Navigation hooks
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const ReactModule = require('react');
  return {
    ...actualNav,
    useRoute: () => ({ params: {} }),
    useNavigation: () => ({
      setParams: jest.fn(),
      navigate: jest.fn(),
    }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactModule.useEffect(() => {
        const cleanup = callback();
        return () => {
          if (typeof cleanup === 'function') cleanup();
        };
      }, [callback]);
    },
  };
});

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

const mockRootFolders: SafeFolder[] = [
  {
    id: 'folder-projects-uuid',
    name: 'Projects',
    parentId: null,
    createdById: 'admin-uuid-1',
    createdAt: '2026-07-10T10:00:00.000Z',
    updatedAt: '2026-07-10T10:00:00.000Z',
  },
];

const mockRootFiles: SafeFile[] = [
  {
    id: 'file-readme-uuid',
    name: 'README_GATEWAY.txt',
    mimeType: 'text/plain',
    sizeBytes: 1024,
    folderId: null,
    uploadedById: 'admin-uuid-1',
    createdAt: '2026-07-11T10:00:00.000Z',
    updatedAt: '2026-07-11T10:00:00.000Z',
  },
];

const mockChildFolders: SafeFolder[] = [
  {
    id: 'folder-specs-uuid',
    name: 'Specs',
    parentId: 'folder-projects-uuid',
    createdById: 'admin-uuid-1',
    createdAt: '2026-07-12T10:00:00.000Z',
    updatedAt: '2026-07-12T10:00:00.000Z',
  },
];

const mockChildFiles: SafeFile[] = [
  {
    id: 'file-arch-uuid',
    name: 'Architecture_v1.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 2048576,
    folderId: 'folder-projects-uuid',
    uploadedById: 'admin-uuid-1',
    createdAt: '2026-07-13T10:00:00.000Z',
    updatedAt: '2026-07-13T10:00:00.000Z',
  },
];

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

describe('Mobile Storage Browser Phase 2 Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
      username: 'auth_token',
      password: 'valid-jwt-token',
      service: 'com.securestoragemobile.auth',
    } as Keychain.UserCredentials);
    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockAdminUser });
  });

  it('1. Root Storage renders root folders and files', async () => {
    const foldersSpy = jest.spyOn(storageApi, 'getFoldersApi').mockResolvedValue(mockRootFolders);
    const filesSpy = jest.spyOn(storageApi, 'getFilesApi').mockResolvedValue(mockRootFiles);

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(foldersSpy).toHaveBeenCalledWith({ parentId: 'root' });
      expect(filesSpy).toHaveBeenCalledWith({ folderId: 'root' });
      expect(screen.getByText('Projects')).toBeTruthy();
      expect(screen.getByText('README_GATEWAY.txt')).toBeTruthy();
    });
  });

  it('2. Tapping a folder loads contents of that child folder ID', async () => {
    jest.spyOn(storageApi, 'getFoldersApi').mockImplementation(async (params) => {
      if (params?.parentId === 'folder-projects-uuid') return mockChildFolders;
      return mockRootFolders;
    });
    jest.spyOn(storageApi, 'getFilesApi').mockImplementation(async (params) => {
      if (params?.folderId === 'folder-projects-uuid') return mockChildFiles;
      return mockRootFiles;
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Projects'));
    });

    await waitFor(() => {
      expect(screen.getByText('Specs')).toBeTruthy();
      expect(screen.getByText('Architecture_v1.docx')).toBeTruthy();
    });
  });

  it('3. Nested folder Back button returns to the parent folder', async () => {
    jest.spyOn(storageApi, 'getFoldersApi').mockImplementation(async (params) => {
      if (params?.parentId === 'folder-projects-uuid') return mockChildFolders;
      return mockRootFolders;
    });
    jest.spyOn(storageApi, 'getFilesApi').mockImplementation(async (params) => {
      if (params?.folderId === 'folder-projects-uuid') return mockChildFiles;
      return mockRootFiles;
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeTruthy();
    });

    // Enter child folder
    await act(async () => {
      fireEvent.press(screen.getByText('Projects'));
    });

    await waitFor(() => {
      expect(screen.getByText('Architecture_v1.docx')).toBeTruthy();
    });

    // Press Back
    await act(async () => {
      fireEvent.press(screen.getByText('Back'));
    });

    await waitFor(() => {
      expect(screen.getByText('README_GATEWAY.txt')).toBeTruthy();
    });
  });

  it('4. Empty folder state renders clearly when folder has 0 subfolders and 0 files', async () => {
    jest.spyOn(storageApi, 'getFoldersApi').mockResolvedValue([]);
    jest.spyOn(storageApi, 'getFilesApi').mockResolvedValue([]);

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('storage-empty-state')).toBeTruthy();
      expect(screen.getByText('No subfolders or files exist in this location.')).toBeTruthy();
    });
  });

  it('5. Storage loading state is visible while fetching folder contents', async () => {
    jest.spyOn(storageApi, 'getFoldersApi').mockImplementation(() => new Promise(() => {}));
    jest.spyOn(storageApi, 'getFilesApi').mockImplementation(() => new Promise(() => {}));

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Loading folder contents...')).toBeTruthy();
    });
  });

  it('6. Storage error state provides Retry button on API error', async () => {
    const foldersSpy = jest
      .spyOn(storageApi, 'getFoldersApi')
      .mockRejectedValueOnce(new Error('Storage unavailable'))
      .mockResolvedValueOnce(mockRootFolders);
    jest.spyOn(storageApi, 'getFilesApi').mockResolvedValue(mockRootFiles);

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Storage')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Retry'));
    });

    await waitFor(() => {
      expect(foldersSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Projects')).toBeTruthy();
    });
  });

  it('7. Long folder and file names do not expose raw internal IDs in UI', async () => {
    const longNamedFolder: SafeFolder = {
      id: 'folder-very-long-secret-uuid-12345',
      name: 'Very_Long_Department_Folder_Name_That_Exceeds_Normal_Width',
      parentId: null,
      createdById: 'admin-uuid-1',
      createdAt: '2026-07-10T10:00:00.000Z',
      updatedAt: '2026-07-10T10:00:00.000Z',
    };

    jest.spyOn(storageApi, 'getFoldersApi').mockResolvedValue([longNamedFolder]);
    jest.spyOn(storageApi, 'getFilesApi').mockResolvedValue([]);

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Very_Long_Department_Folder_Name_That_Exceeds_Normal_Width')).toBeTruthy();
      expect(screen.queryByText(/folder-very-long-secret-uuid-12345/i)).toBeNull();
    });
  });

  it('8. Viewer sees the same read-only storage content with no mutation controls', async () => {
    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockViewerUser });
    jest.spyOn(storageApi, 'getFoldersApi').mockResolvedValue(mockRootFolders);
    jest.spyOn(storageApi, 'getFilesApi').mockResolvedValue(mockRootFiles);

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeTruthy();
      expect(screen.getByText('README_GATEWAY.txt')).toBeTruthy();
      expect(screen.queryByText(/Upload/i)).toBeNull();
      expect(screen.queryByText(/New Folder/i)).toBeNull();
      expect(screen.queryByText(/Delete/i)).toBeNull();
    });
  });

  it('9. Admin also has no mutation controls rendered during Phase 2', async () => {
    jest.spyOn(storageApi, 'getFoldersApi').mockResolvedValue(mockRootFolders);
    jest.spyOn(storageApi, 'getFilesApi').mockResolvedValue(mockRootFiles);

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeTruthy();
      expect(screen.queryByText(/Upload/i)).toBeNull();
      expect(screen.queryByText(/New Folder/i)).toBeNull();
      expect(screen.queryByText(/Rename/i)).toBeNull();
      expect(screen.queryByText(/Delete/i)).toBeNull();
    });
  });
});
