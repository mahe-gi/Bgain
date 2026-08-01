import { useQuery } from '@tanstack/react-query';
import { searchGlobalApi } from '../api/search.api';
import { useAuth } from './useAuth';

export function useSearch(submittedQuery: string) {
  const { status } = useAuth();
  const trimmed = submittedQuery.trim();
  const isValidQuery = trimmed.length >= 2 && trimmed.length <= 100;
  const isAuthenticated = status === 'authenticated';

  return useQuery({
    queryKey: ['search', trimmed.toLowerCase()],
    queryFn: () => searchGlobalApi(trimmed),
    enabled: Boolean(isValidQuery && isAuthenticated),
    retry: false,
  });
}
