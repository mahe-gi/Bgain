import { apiClient } from "./client.js";
import type { ApiSuccessEnvelope } from "../types/api.js";
import type { DashboardData } from "../types/dashboard.js";

export async function getDashboardApi(): Promise<DashboardData> {
  const response = await apiClient.get<ApiSuccessEnvelope<DashboardData>>("/dashboard");
  return response.data.data;
}
