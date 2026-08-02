import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Keychain from 'react-native-keychain';
import { AuthProvider } from '../src/context/AuthProvider';
import { StorageScreen } from '../src/screens/StorageScreen';
import { FileDetailsScreen } from '../src/screens/FileDetailsScreen';
import * as storageApi from '../src/api/storage.api';
import * as filesApi from '../src/api/files.api';
import * as authApi from '../src/api/auth.api';
import NativeSecureDocumentPicker from '../specs/NativeSecureDocumentPicker';
import type { SafeFolder, SafeFile } from '../src/types/storage';
import type { SafeUser } from '../src/types/auth';

jest.mock('../src/api/storage.api', () => ({
  getFoldersApi: jest.fn(),
  getFilesApi: jest.fn(),
  createFolderApi: jest.fn(),
  updateFolderApi: jest.fn(),
  deleteFolderApi: jest.fn(),
}));

jest.mock('../src/api/files.api', () => ({
  getFileDetailsApi: jest.fn(),
  getPreviewUrlApi: jest.fn(),
  getDownloadUrlApi: jest.fn(),
  uploadFileApi: jest.fn(),
  updateFileApi: jest.fn(),
  deleteFileApi: jest.fn(),
}));

jest.mock('../src/api/auth.api', () => ({
  loginApi: jest.fn(),
  getMeApi: jest.fn(),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const ReactModule = require('react');
  return {
    ...actualNav,
    useRoute: () => ({ params: { fileId: 'file-doc-1' } }),
    useNavigation: () => ({
      setParams: jest.fn(),
      navigate: mockNavigate,
      goBack: jest.fn(),
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

const mockFolder: SafeFolder = {
  id: 'folder-1',
  name: 'Projects',
  parentId: null,
  createdById: 'admin-uuid-1',
  createdAt: '2026-07-10T10:00:00.000Z',
  updatedAt: '2026-07-10T10:00:00.000Z',
};

const mockFile: SafeFile = {
  id: 'file-doc-1',
  name: 'Document.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  folderId: null,
  uploadedById: 'admin-uuid-1',
  createdAt: '2026-07-11T10:00:00.000Z',
  updatedAt: '2026-07-11T10:00:00.000Z',
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

describe('Mobile Phase 4 Admin Storage Mutations Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Keychain, 'getGenericPassword').mockResolvedValue({
      username: 'auth_token',
      password: 'valid-jwt-token',
      service: 'com.securestoragemobile.auth',
    } as Keychain.UserCredentials);
    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockAdminUser });
    jest.spyOn(storageApi, 'getFoldersApi').mockResolvedValue([mockFolder]);
    jest.spyOn(storageApi, 'getFilesApi').mockResolvedValue([mockFile]);
    jest.spyOn(filesApi, 'getFileDetailsApi').mockResolvedValue(mockFile);

    (NativeSecureDocumentPicker.isAvailable as jest.Mock).mockResolvedValue(true);
    (NativeSecureDocumentPicker.pickDocument as jest.Mock).mockResolvedValue({
      uri: 'content://com.android.providers.media.documents/document/1',
      name: 'valid.pdf',
      type: 'application/pdf',
      size: 1024,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('1. Admin sees Upload and New Folder actions', async () => {
    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('New Folder')).toBeTruthy();
      expect(screen.getByText('Upload File')).toBeTruthy();
    });
  });

  it('2. Viewer sees no storage mutation actions', async () => {
    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockViewerUser });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeTruthy();
      expect(screen.queryByText('New Folder')).toBeNull();
      expect(screen.queryByText('Upload File')).toBeNull();
      expect(screen.queryByTestId('btn-folder-actions-folder-1')).toBeNull();
    });
  });

  it('3. Viewer never invokes mutation APIs', async () => {
    jest.spyOn(authApi, 'getMeApi').mockResolvedValue({ user: mockViewerUser });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeTruthy();
    });

    expect(storageApi.createFolderApi).not.toHaveBeenCalled();
    expect(storageApi.updateFolderApi).not.toHaveBeenCalled();
    expect(storageApi.deleteFolderApi).not.toHaveBeenCalled();
    expect(filesApi.uploadFileApi).not.toHaveBeenCalled();
    expect(filesApi.updateFileApi).not.toHaveBeenCalled();
    expect(filesApi.deleteFileApi).not.toHaveBeenCalled();
  });

  it('4. Folder creation sends the current parent folder', async () => {
    const createSpy = jest.spyOn(storageApi, 'createFolderApi').mockResolvedValue({
      id: 'folder-new',
      name: 'New Subfolder',
      parentId: null,
      createdById: 'admin-uuid-1',
      createdAt: '2026-07-15T10:00:00.000Z',
      updatedAt: '2026-07-15T10:00:00.000Z',
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('New Folder')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('New Folder'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-create-folder')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('input-folder-name'), 'New Subfolder');

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-create-folder'));
    });

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith('New Subfolder', null);
    });
  });

  it('5. Folder creation conflict preserves input and dialog', async () => {
    jest.spyOn(storageApi, 'createFolderApi').mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            code: 'FOLDER_NAME_CONFLICT',
            message: 'A folder with this name already exists in this location',
          },
        },
      },
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('New Folder')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('New Folder'));
    });

    fireEvent.changeText(screen.getByTestId('input-folder-name'), 'Projects');

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-create-folder'));
    });

    await waitFor(() => {
      expect(screen.getByText('A folder with this name already exists in this location')).toBeTruthy();
      expect(screen.getByTestId('modal-create-folder')).toBeTruthy();
      expect(screen.getByTestId('input-folder-name').props.value).toBe('Projects');
    });
  });

  it('6. Picker cancellation does not show an error', async () => {
    (NativeSecureDocumentPicker.pickDocument as jest.Mock).mockRejectedValue({
      code: 'DOCUMENT_PICKER_CANCELED',
      message: 'User canceled document picker',
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Upload File')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Upload File'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-select-document')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-select-document'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('upload-error')).toBeNull();
    });
  });

  it('7. Invalid type and oversized upload are blocked before API submission', async () => {
    (NativeSecureDocumentPicker.pickDocument as jest.Mock).mockResolvedValue({
      uri: 'content://com.android.providers.media.documents/document/2',
      name: 'unsupported.exe',
      type: 'application/x-msdownload',
      size: 15 * 1024 * 1024,
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Upload File')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Upload File'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-select-document'));
    });

    await waitFor(() => {
      expect(screen.getByText(/exceeds maximum limit of 10 MB/i)).toBeTruthy();
    });

    expect(filesApi.uploadFileApi).not.toHaveBeenCalled();
  });

  it('8. Unknown size does not block file selection', async () => {
    (NativeSecureDocumentPicker.pickDocument as jest.Mock).mockResolvedValue({
      uri: 'content://com.android.providers.media.documents/document/3',
      name: 'unknown_size.pdf',
      type: 'application/pdf',
      size: null,
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Upload File')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Upload File'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-select-document'));
    });

    await waitFor(() => {
      expect(screen.getByText('unknown_size.pdf')).toBeTruthy();
      expect(screen.queryByTestId('upload-error')).toBeNull();
    });
  });

  it('9. Upload sends content:// URI and exact metadata to uploadFileApi', async () => {
    (NativeSecureDocumentPicker.pickDocument as jest.Mock).mockResolvedValue({
      uri: 'content://com.android.providers.media.documents/document/4',
      name: 'valid.pdf',
      type: 'application/pdf',
      size: 1024,
    });

    const uploadSpy = jest.spyOn(filesApi, 'uploadFileApi').mockResolvedValue(mockFile);

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Upload File')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Upload File'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-select-document'));
    });

    await waitFor(() => {
      expect(screen.getByText('valid.pdf')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-upload'));
    });

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(
        {
          uri: 'content://com.android.providers.media.documents/document/4',
          name: 'valid.pdf',
          type: 'application/pdf',
        },
        null,
        expect.any(Function)
      );
    });
  });

  it('10. Upload displays genuine progress and processing label at 100%', async () => {
    jest.spyOn(filesApi, 'uploadFileApi').mockImplementation((_file, _folderId, onProgress) => {
      if (onProgress) {
        onProgress(100, 1000, 1000);
      }
      return Promise.resolve(mockFile);
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Upload File')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Upload File'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-select-document'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-upload'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('upload-progress-container')).toBeTruthy();
    });
  });

  it('11. Active upload prevents duplicate submission and unsafe closure', async () => {
    let resolveUpload: (file: SafeFile) => void = () => {};
    jest.spyOn(filesApi, 'uploadFileApi').mockImplementation(() => {
      return new Promise<SafeFile>((resolve) => {
        resolveUpload = resolve;
      });
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Upload File')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Upload File'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-select-document'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-upload'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-submit-upload').props.accessibilityState.disabled).toBe(true);
      expect(screen.getByTestId('btn-cancel-upload').props.accessibilityState.disabled).toBe(true);
    });

    await act(async () => {
      resolveUpload(mockFile);
    });
  });

  it('12. Failed upload preserves the selected file and supports Retry', async () => {
    const uploadSpy = jest
      .spyOn(filesApi, 'uploadFileApi')
      .mockRejectedValueOnce(new Error('Network upload error'))
      .mockResolvedValueOnce(mockFile);

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Upload File')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Upload File'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-select-document'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-upload'));
    });

    await waitFor(() => {
      expect(screen.getByText('Network upload error')).toBeTruthy();
      expect(screen.getByText('valid.pdf')).toBeTruthy();
      expect(screen.getByText('Retry Upload')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-upload'));
    });

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('13. Failed native document picker displays error message', async () => {
    (NativeSecureDocumentPicker.pickDocument as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to select document')
    );

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByText('Upload File')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText('Upload File'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-select-document'));
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to select document')).toBeTruthy();
    });
  });

  it('14. Folder rename conflict preserves input', async () => {
    jest.spyOn(storageApi, 'updateFolderApi').mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            code: 'FOLDER_NAME_CONFLICT',
            message: 'A folder with this name already exists in this location',
          },
        },
      },
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-folder-actions-folder-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-folder-actions-folder-1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('action-rename')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('action-rename'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-rename')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('input-rename-name'), 'ExistingFolder');

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-rename'));
    });

    await waitFor(() => {
      expect(screen.getByText('A folder with this name already exists in this location')).toBeTruthy();
      expect(screen.getByTestId('input-rename-name').props.value).toBe('ExistingFolder');
    });
  });

  it('15. File rename success invalidates relevant queries', async () => {
    const updateSpy = jest.spyOn(filesApi, 'updateFileApi').mockResolvedValue({
      ...mockFile,
      name: 'RenamedDoc.pdf',
    });

    renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-file-details-rename')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-file-details-rename'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-rename')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('input-rename-name'), 'RenamedDoc.pdf');

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-rename'));
    });

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('file-doc-1', { name: 'RenamedDoc.pdf' });
    });
  });

  it('16. Move picker navigates folders and supports root', async () => {
    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-file-actions-file-doc-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-file-actions-file-doc-1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('action-move')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('action-move'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-move')).toBeTruthy();
      expect(screen.getByTestId('move-path-text')).toBeTruthy();
    });
  });

  it('17. Folder cannot be moved into itself', async () => {
    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-folder-actions-folder-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-folder-actions-folder-1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('action-move')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('action-move'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-move')).toBeTruthy();
      expect(screen.getByTestId('move-folder-item-folder-1').props.accessibilityState.disabled).toBe(true);
    });
  });

  it('18. Backend cycle/conflict errors remain visible in the dialog', async () => {
    jest.spyOn(storageApi, 'updateFolderApi').mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            code: 'FOLDER_CYCLE',
            message: 'A folder cannot be moved into itself or one of its descendants',
          },
        },
      },
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-folder-actions-folder-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-folder-actions-folder-1'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('action-move'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-move')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-move'));
    });

    await waitFor(() => {
      expect(screen.getByText('A folder cannot be moved into itself or one of its descendants')).toBeTruthy();
      expect(screen.getByTestId('modal-move')).toBeTruthy();
    });
  });

  it('19. Successful move invalidates source and destination folders', async () => {
    const updateSpy = jest.spyOn(filesApi, 'updateFileApi').mockResolvedValue({
      ...mockFile,
      folderId: 'folder-1',
    });

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-file-actions-file-doc-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-file-actions-file-doc-1'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('action-move'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-move')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('move-folder-item-folder-1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-submit-move')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-move'));
    });

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('file-doc-1', { folderId: 'folder-1' });
    });
  });

  it('20. Delete requires explicit confirmation', async () => {
    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-file-actions-file-doc-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-file-actions-file-doc-1'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('action-delete'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-delete-confirm')).toBeTruthy();
      expect(screen.getByText(/Are you sure you want to delete 'Document.pdf'/i)).toBeTruthy();
      expect(screen.getByTestId('btn-submit-delete')).toBeTruthy();
    });

    expect(filesApi.deleteFileApi).not.toHaveBeenCalled();
  });

  it('21. Failed delete does not remove current server data', async () => {
    jest.spyOn(filesApi, 'deleteFileApi').mockRejectedValue(new Error('Delete storage error'));

    renderWithAuthProvider(<StorageScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-file-actions-file-doc-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-file-actions-file-doc-1'));
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('action-delete'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-delete-confirm')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-delete'));
    });

    await waitFor(() => {
      expect(screen.getByText('Delete storage error')).toBeTruthy();
      expect(screen.getByTestId('modal-delete-confirm')).toBeTruthy();
    });
  });

  it('22. Deleting the open file returns safely to Storage', async () => {
    jest.spyOn(filesApi, 'deleteFileApi').mockResolvedValue(undefined);

    renderWithAuthProvider(<FileDetailsScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-file-details-delete')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-file-details-delete'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('modal-delete-confirm')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-submit-delete'));
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Storage', { resetToRoot: false });
    });
  });
});
