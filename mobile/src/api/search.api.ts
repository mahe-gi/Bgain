import { apiClient } from './client';
import type { ApiSuccess } from '../types/api';
import type { SearchResultData } from '../types/search';

export async function searchGlobalApi(query: string): Promise<SearchResultData> {
  const response = await apiClient.get<ApiSuccess<SearchResultData>>('/search', {
    params: { q: query.trim() },
  });
  return response.data.data;
}
