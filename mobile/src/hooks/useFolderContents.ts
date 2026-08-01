import { useQuery } from '@tanstack/react-query';
import { getFoldersApi, getFilesApi } from '../api/storage.api';
import { useAuth } from './useAuth';

export function useFolderContents(folderId: string = 'root') {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  const foldersQuery = useQuery({
    queryKey: ['folders', folderId],
    queryFn: () => getFoldersApi({ parentId: folderId }),
    enabled: isAuthenticated,
    retry: false,
  });

  const filesQuery = useQuery({
    queryKey: ['files', folderId],
    queryFn: () => getFilesApi({ folderId }),
    enabled: isAuthenticated,
    retry: false,
  });

  const isLoading = foldersQuery.isLoading || filesQuery.isLoading;
  const isError = foldersQuery.isError || filesQuery.isError;
  const error = foldersQuery.error || filesQuery.error;
  const isRefetching = foldersQuery.isRefetching || filesQuery.isRefetching;

  const refetch = async () => {
    await Promise.all([foldersQuery.refetch(), filesQuery.refetch()]);
  };

  return {
    folders: foldersQuery.data || [],
    files: filesQuery.data || [],
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  };
}
