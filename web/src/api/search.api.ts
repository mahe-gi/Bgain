import { apiClient } from "./client.js";
import type { ApiSuccessEnvelope } from "../types/api.js";
import type { SearchResult } from "../types/search.js";

export async function searchApi(query: string): Promise<SearchResult> {
  const response = await apiClient.get<ApiSuccessEnvelope<SearchResult>>("/search", {
    params: { q: query }
  });
  return response.data.data;
}
