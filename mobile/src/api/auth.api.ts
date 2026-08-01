import { apiClient } from './client';
import type { ApiSuccess } from '../types/api';
import type { SafeUser } from '../types/auth';

export type LoginResponseData = {
  accessToken: string;
  user: SafeUser;
};

export type MeResponseData = {
  user: SafeUser;
};

export const loginApi = async (email: string, pass: string): Promise<LoginResponseData> => {
  const response = await apiClient.post<ApiSuccess<LoginResponseData>>('/auth/login', {
    email,
    password: pass,
  });
  return response.data.data;
};

export const getMeApi = async (): Promise<MeResponseData> => {
  const response = await apiClient.get<ApiSuccess<MeResponseData>>('/auth/me');
  return response.data.data;
};
