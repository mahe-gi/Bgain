export type Role = "ADMIN" | "VIEWER";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthState {
  user: SafeUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponseData {
  accessToken: string;
  user: SafeUser;
}
