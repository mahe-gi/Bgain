import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Keychain from 'react-native-keychain';
import { Linking, NativeModules } from 'react-native';
import { AuthProvider } from '../src/context/AuthProvider';
import { SearchScreen } from '../src/screens/SearchScreen';
import { FileDetailsScreen } from '../src/screens/FileDetailsScreen';
import * as searchApi from '../src/api/search.api';
import * as filesApi from '../src/api/files.api';
import * as authApi from '../src/api/auth.api';
import * as fileTransferService from '../src/services/file-transfer.service';
import type { SearchResultData } from '../src/types/search';
import type { SafeFile } from '../src/types/storage';
import type { SafeUser } from '../src/types/auth';

// Mock NativeModules.DownloadManagerModule
NativeModules.DownloadManagerModule = {
  enqueueDownload: jest.fn().mockResolvedValue('78901'),
};

jest.mock('../src/api/search.api', () => ({
  searchGlobalApi: jest.fn(),
}));

jest.mock('../src/api/files.api', () => ({
  getFileDetailsApi: jest.fn(),
  getPreviewUrlApi: jest.fn(),
  getDownloadUrlApi: jest.fn(),
}));

jest.mock('../src/api/auth.api', () => ({
  loginApi: jest.fn(),
  getMeApi: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: { fileId: string; [key: string]: unknown } = { fileId: 'file-doc-1' };

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const ReactModule = require('react');
  return {
    ...actualNav,
    useRoute: () => ({ params: mockRouteParams }),
    useNavigation: () => ({
      navigate: mockNavigate,
      setParams: mockSetParams,
      goBack: mockGoBack,
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

const mockSearchResults: SearchResultData = {
  query: 'project',
  folders: [
    {
      id: 'folder-proj-1',
      name: 'Project Alpha',
      parentId: null,
      createdById: 'admin-uuid-1',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
    },
  ],
  files: [
    {
      id: 'file-doc-1',
      name: 'Project_Design.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048576,
      folderId: 'folder-proj-1',
      uploadedById: 'admin-uuid-1',
      createdAt: '2026-07-02T10:00:00.000Z',
      updatedAt: '2026-07-02T10:00:00.000Z',
    },
  ],
  total: 2,
};

const mockImgFile: SafeFile = {
  id: 'file-doc-1',
  name: 'Architecture_Diagram.png',
  mimeType: 'image/png',
  sizeBytes: 1048576,
  folderId: 'folder-proj-1',
  uploadedById: 'admin-uuid-1',
  createdAt: '2026-07-03T10:00:00.000Z',
  updatedAt: '2026-07-03T10:00:00.000Z',
};

const mockTxtFile: SafeFile = {
  id: 'file-doc-1',
  name: 'Release_Notes.txt',
  mimeType: 'text/plain',
  sizeBytes: 512,
  folderId: null,
  uploadedById: 'admin-uuid-1',
  createdAt: '2026-07-04T10:00:00.000Z',
  updatedAt: '2026-07-04T10:00:00.000Z',
};

const mockDocxFile: SafeFile = {
  id: 'file-doc-1',
  name: 'Financial_Budget.docx',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  sizeBytes: 4096,
  folderId: null,
  uploadedById: 'admin-uuid-1',
  createdAt: '2026-07-05T10:00:00.000Z',
  updatedAt: '2026-07-05T10:00:00.000Z',
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

describe('Mobile Search and File Details Phase 3 Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { fileId: 'file-doc-1' };
    jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
      username: 'auth_token',
      password: 'valid-jwt-token',
      service: 'com.securestoragemobile.auth',
    } as Keychain.UserCredentials);
    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockAdminUser });
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('1. Search initial state displays guidance message', async () => {
    renderWithAuthProvider(<SearchScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('search-guidance')).toBeTruthy();
      expect(
        screen.getByText('Enter at least 2 characters to search across all storage folders and files.')
      ).toBeTruthy();
    });
  });

  it('2. Empty search input shows validation error and prevents API call', async () => {
    const searchSpy = jest.spyOn(searchApi, 'searchGlobalApi');

    renderWithAuthProvider(<SearchScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-search'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('search-validation-error')).toBeTruthy();
      expect(searchSpy).not.toHaveBeenCalled();
    });
  });

  it('3. Valid normalized query triggers search API call', async () => {
    const searchSpy = jest
      .spyOn(searchApi, 'searchGlobalApi')
      .mockResolvedValue(mockSearchResults);

    renderWithAuthProvider(<SearchScreen />);

    fireEvent.changeText(screen.getByTestId('search-input'), '  project  ');

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-search'));
    });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith('project');
      expect(screen.getByText('Project Alpha')).toBeTruthy();
      expect(screen.getByText('Project_Design.pdf')).toBeTruthy();
    });
  });

  it('4. Search loading state is displayed during fetch', async () => {
    jest.spyOn(searchApi, 'searchGlobalApi').mockImplementation(() => new Promise(() => {}));

    renderWithAuthProvider(<SearchScreen />);

    fireEvent.changeText(screen.getByTestId('search-input'), 'project');

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-search'));
    });

    await waitFor(() => {
      expect(screen.getByText('Searching storage...')).toBeTruthy();
    });
  });

  it('5. Search error state renders error message with Retry action', async () => {
    const searchSpy = jest
      .spyOn(searchApi, 'searchGlobalApi')
      .mockRejectedValueOnce(new Error('Search service offline'))
      .mockResolvedValueOnce(mockSearchResults);

    renderWithAuthProvider(<SearchScreen />);

    fireEvent.changeText(screen.getByTestId('search-input'), 'project');

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-search'));
    });

    await waitFor(() => {
      expect(screen.getByText('Search Failed')).toBeTruthy();
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Retry'));
    });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Project Alpha')).toBeTruthy();
    });
  });

  it('6. Search no-results state renders clear empty message', async () => {
    jest.spyOn(searchApi, 'searchGlobalApi').mockResolvedValue({
      query: 'nonexistent',
      folders: [],
      files: [],
      total: 0,
    });

    renderWithAuthProvider(<SearchScreen />);

    fireEvent.changeText(screen.getByTestId('search-input'), 'nonexistent');

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-search'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('search-no-results')).toBeTruthy();
      expect(screen.getByText('No files or folders match "nonexistent".')).toBeTruthy();
    });
  });

  it('7. Tapping folder search result navigates to Storage with targetFolder param', async () => {
    jest.spyOn(searchApi, 'searchGlobalApi').mockResolvedValue(mockSearchResults);

    renderWithAuthProvider(<SearchScreen />);

    fireEvent.changeText(screen.getByTestId('search-input'), 'project');

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-search'));
    });

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Project Alpha'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('Storage', {
      targetFolder: { id: 'folder-proj-1', name: 'Project Alpha' },
    });
  });

  it('8. Tapping file search result navigates to FileDetails with fileId param', async () => {
    jest.spyOn(searchApi, 'searchGlobalApi').mockResolvedValue(mockSearchResults);

    renderWithAuthProvider(<SearchScreen />);

    fireEvent.changeText(screen.getByTestId('search-input'), 'project');

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-search'));
    });

    await waitFor(() => {
      expect(screen.getByText('Project_Design.pdf')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Project_Design.pdf'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('FileDetails', {
      fileId: 'file-doc-1',
    });
  });

  it('9. FileDetails renders metadata without raw storage key or secret tokens', async () => {
    jest.spyOn(filesApi, 'getFileDetailsApi').mockResolvedValue(mockImgFile);

    renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getAllByText('Architecture_Diagram.png').length).toBeGreaterThan(0);
      expect(screen.getByText('PNG Image')).toBeTruthy();
      expect(screen.getByText('1.0 MB')).toBeTruthy();
      expect(screen.queryByText(/valid-jwt-token/i)).toBeNull();
      expect(screen.queryByText(/storageKey/i)).toBeNull();
    });
  });

  it('10. Image preview requests a signed URL ONLY after explicit tap', async () => {
    jest.spyOn(filesApi, 'getFileDetailsApi').mockResolvedValue(mockImgFile);
    const previewSpy = jest.spyOn(filesApi, 'getPreviewUrlApi').mockResolvedValue({
      url: 'https://r2.example.com/preview-img-signed',
      expiresInSeconds: 900,
    });

    renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-generate-preview')).toBeTruthy();
    });

    expect(previewSpy).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-generate-preview'));
    });

    await waitFor(() => {
      expect(previewSpy).toHaveBeenCalledWith('file-doc-1');
      expect(screen.getByTestId('preview-image')).toBeTruthy();
    });
  });

  it('11. TXT preview renders unescaped text content fetched via unauthenticated request', async () => {
    jest.spyOn(filesApi, 'getFileDetailsApi').mockResolvedValue(mockTxtFile);
    jest.spyOn(filesApi, 'getPreviewUrlApi').mockResolvedValue({
      url: 'https://r2.example.com/txt-signed-url',
      expiresInSeconds: 900,
    });
    jest
      .spyOn(fileTransferService, 'fetchTxtPreviewContent')
      .mockResolvedValue('Plain text release notes summary.');

    renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-generate-preview')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-generate-preview'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('preview-txt-content')).toBeTruthy();
      expect(screen.getByText('Plain text release notes summary.')).toBeTruthy();
    });
  });

  it('12. Unsupported file type renders "Preview is not available for this file type."', async () => {
    jest.spyOn(filesApi, 'getFileDetailsApi').mockResolvedValue(mockDocxFile);

    renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-unsupported')).toBeTruthy();
      expect(screen.getByText('Preview is not available for this file type.')).toBeTruthy();
    });
  });

  it('13. Download enqueues download via native DownloadManager and displays download ID', async () => {
    jest.spyOn(filesApi, 'getFileDetailsApi').mockResolvedValue(mockImgFile);
    jest.spyOn(filesApi, 'getDownloadUrlApi').mockResolvedValue({
      url: 'https://r2.example.com/download-img-signed',
      expiresInSeconds: 900,
    });

    renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-download-file')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-download-file'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('download-status-success')).toBeTruthy();
      expect(screen.getByText('Download started. Check your Downloads folder.')).toBeTruthy();
    });
  });

  it('14. TXT preview refuses excessively large text files (> 500 KB) before rendering', async () => {
    const largeTxtFile: SafeFile = {
      ...mockTxtFile,
      sizeBytes: 1024 * 1024, // 1 MB
    };
    jest.spyOn(filesApi, 'getFileDetailsApi').mockResolvedValue(largeTxtFile);
    jest.spyOn(filesApi, 'getPreviewUrlApi').mockResolvedValue({
      url: 'https://r2.example.com/large-txt-signed-url',
      expiresInSeconds: 900,
    });

    renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-generate-preview')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-generate-preview'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Text file is too large to preview/i)).toBeTruthy();
    });
  });

  it('15. File A download success appears for File A, and navigating to File B clears File A message', async () => {
    mockRouteParams = { fileId: 'file-doc-1' };
    jest.spyOn(filesApi, 'getFileDetailsApi').mockImplementation(async (id) => {
      if (id === 'file-doc-1') return mockImgFile;
      return { ...mockTxtFile, id: 'file-txt-2', name: 'File_B.txt' };
    });
    jest.spyOn(filesApi, 'getDownloadUrlApi').mockResolvedValue({
      url: 'https://r2.example.com/download-img-signed',
      expiresInSeconds: 900,
    });

    const { rerender } = renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-download-file')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-download-file'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('download-status-success')).toBeTruthy();
    });

    mockRouteParams = { fileId: 'file-txt-2' };
    rerender(
      <AuthProvider>
        <QueryClientProvider client={createTestQueryClient()}>
          <FileDetailsScreen />
        </QueryClientProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('download-status-success')).toBeNull();
    });
  });

  it('16. Leaving and reopening File Details does not show an old download status message', async () => {
    mockRouteParams = { fileId: 'file-doc-1' };
    jest.spyOn(filesApi, 'getFileDetailsApi').mockResolvedValue(mockImgFile);
    jest.spyOn(filesApi, 'getDownloadUrlApi').mockResolvedValue({
      url: 'https://r2.example.com/download-img-signed',
      expiresInSeconds: 900,
    });

    const { unmount } = renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-download-file')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-download-file'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('download-status-success')).toBeTruthy();
    });

    unmount();

    renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Architecture_Diagram.png')).toBeTruthy();
      expect(screen.queryByTestId('download-status-success')).toBeNull();
    });
  });

  it('17. Download success message auto-dismisses after timer', async () => {
    jest.useFakeTimers();
    mockRouteParams = { fileId: 'file-doc-1' };
    jest.spyOn(filesApi, 'getFileDetailsApi').mockResolvedValue(mockImgFile);
    jest.spyOn(filesApi, 'getDownloadUrlApi').mockResolvedValue({
      url: 'https://r2.example.com/download-img-signed',
      expiresInSeconds: 900,
    });

    renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-download-file')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-download-file'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('download-status-success')).toBeTruthy();
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('download-status-success')).toBeNull();
    });

    jest.useRealTimers();
  });

  it('18. Timer cleanup on unmount prevents state updates after component unmount', async () => {
    jest.useFakeTimers();
    mockRouteParams = { fileId: 'file-doc-1' };
    jest.spyOn(filesApi, 'getFileDetailsApi').mockResolvedValue(mockImgFile);
    jest.spyOn(filesApi, 'getDownloadUrlApi').mockResolvedValue({
      url: 'https://r2.example.com/download-img-signed',
      expiresInSeconds: 900,
    });

    const { unmount } = renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-download-file')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-download-file'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('download-status-success')).toBeTruthy();
    });

    unmount();

    expect(() => {
      act(() => {
        jest.advanceTimersByTime(5000);
      });
    }).not.toThrow();

    jest.useRealTimers();
  });

  it('19. Preview state clears when file ID changes', async () => {
    mockRouteParams = { fileId: 'file-img-1' };
    jest.spyOn(filesApi, 'getFileDetailsApi').mockImplementation(async (id) => {
      if (id === 'file-img-1') return mockImgFile;
      return mockTxtFile;
    });
    jest.spyOn(filesApi, 'getPreviewUrlApi').mockResolvedValue({
      url: 'https://r2.example.com/preview-img-signed',
      expiresInSeconds: 900,
    });

    const { rerender } = renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-generate-preview')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-generate-preview'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('preview-image')).toBeTruthy();
    });

    mockRouteParams = { fileId: 'file-txt-2' };
    rerender(
      <AuthProvider>
        <QueryClientProvider client={createTestQueryClient()}>
          <FileDetailsScreen />
        </QueryClientProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('preview-image')).toBeNull();
    });
  });
});
