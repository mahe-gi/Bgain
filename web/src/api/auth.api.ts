import { apiClient } from "./client.js";
import type { ApiSuccessEnvelope } from "../types/api.js";
import type { LoginResponseData, SafeUser } from "../types/auth.js";

export async function loginApi(email: string, password: string): Promise<LoginResponseData> {
  const response = await apiClient.post<ApiSuccessEnvelope<LoginResponseData>>("/auth/login", {
    email,
    password
  });
  return response.data.data;
}

export async function getMeApi(): Promise<{ user: SafeUser }> {
  const response = await apiClient.get<ApiSuccessEnvelope<{ user: SafeUser }>>("/auth/me");
  return response.data.data;
}
