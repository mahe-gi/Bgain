import axios from 'axios';
import Config from 'react-native-config';
import { getMemoryAccessToken } from '../services/token.service';

const apiBaseUrl = Config.API_BASE_URL || 'http://127.0.0.1:4000/api';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

type UnauthorizedHandler = () => void;
let onUnauthorizedCallback: UnauthorizedHandler | null = null;
let isHandlingUnauthorized = false;

export const registerUnauthorizedHandler = (handler: UnauthorizedHandler): void => {
  onUnauthorizedCallback = handler;
};

export const resetUnauthorizedState = (): void => {
  isHandlingUnauthorized = false;
};

// Request Interceptor: Attach bearer token from memory
apiClient.interceptors.request.use(
  (config) => {
    const token = getMemoryAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle protected 401 expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const { status, config } = error.response;
      const isLoginRequest = config?.url?.includes('/auth/login');

      if (status === 401 && !isLoginRequest) {
        if (!isHandlingUnauthorized) {
          isHandlingUnauthorized = true;
          if (onUnauthorizedCallback) {
            onUnauthorizedCallback();
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Network connection unavailable. Please verify API connection.';
    }
    const data = error.response.data;
    if (data && typeof data === 'object' && 'error' in data) {
      const errObj = (data as { error: { message?: string } }).error;
      if (errObj && typeof errObj.message === 'string') {
        return errObj.message;
      }
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}
