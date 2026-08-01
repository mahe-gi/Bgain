import { apiClient } from "./client.js";
import type { ApiSuccessEnvelope } from "../types/api.js";
import type { SafeUser, CreateUserPayload } from "../types/user.js";

export async function getUsersApi(): Promise<SafeUser[]> {
  const response = await apiClient.get<ApiSuccessEnvelope<{ users: SafeUser[] }>>("/users");
  return response.data.data.users;
}

export async function createUserApi(payload: CreateUserPayload): Promise<SafeUser> {
  const response = await apiClient.post<ApiSuccessEnvelope<{ user: SafeUser } | SafeUser>>("/users", payload);
  const data = response.data.data;
  if ("user" in data && data.user) {
    return data.user;
  }
  return data as SafeUser;
}
