import axios, { AxiosError } from "axios";
import type { ApiErrorEnvelope } from "../types/api.js";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request Interceptor: Attach Bearer token from sessionStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 on protected routes
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorEnvelope>) => {
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    const is401 = error.response?.status === 401;

    // For protected API requests returning 401, clear stored token & redirect to /login
    if (is401 && !isLoginRequest) {
      sessionStorage.removeItem("accessToken");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Utility to extract a safe user-facing error message from backend error envelopes or Axios errors.
 */
export function getErrorMessage(error: unknown, fallbackMessage = "An unexpected error occurred"): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiErrorEnvelope | undefined;
    if (apiError && apiError.error && apiError.error.message) {
      return apiError.error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
}
