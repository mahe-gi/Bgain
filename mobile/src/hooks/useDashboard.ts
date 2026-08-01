import { useQuery } from '@tanstack/react-query';
import { getDashboardApi } from '../api/dashboard.api';
import { useAuth } from './useAuth';

export function useDashboard() {
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';

  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardApi,
    enabled: isAuthenticated,
    retry: false,
  });
}
