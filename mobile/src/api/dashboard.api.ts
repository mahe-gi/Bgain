import { apiClient } from './client';
import type { ApiSuccess } from '../types/api';
import type { DashboardData } from '../types/dashboard';

export async function getDashboardApi(): Promise<DashboardData> {
  const response = await apiClient.get<ApiSuccess<DashboardData>>('/dashboard');
  return response.data.data;
}
