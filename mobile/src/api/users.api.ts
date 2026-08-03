import { apiClient } from './client';
import type { ApiSuccess } from '../types/api';
import type { SafeUser, Role } from '../types/auth';

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

export async function getUsersApi(): Promise<SafeUser[]> {
  const response = await apiClient.get<ApiSuccess<{ users: SafeUser[] }>>('/users');
  return response.data.data.users;
}

export async function createUserApi(payload: CreateUserPayload): Promise<SafeUser> {
  const response = await apiClient.post<ApiSuccess<{ user: SafeUser } | SafeUser>>('/users', payload);
  const data = response.data.data;
  if ('user' in data && data.user) {
    return data.user;
  }
  return data as SafeUser;
}
