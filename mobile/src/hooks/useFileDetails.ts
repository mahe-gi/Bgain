import { useQuery } from '@tanstack/react-query';
import { getFileDetailsApi } from '../api/files.api';
import { useAuth } from './useAuth';

export function useFileDetails(fileId: string) {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  return useQuery({
    queryKey: ['file-details', fileId],
    queryFn: () => getFileDetailsApi(fileId),
    enabled: Boolean(fileId && isAuthenticated),
    retry: false,
  });
}
