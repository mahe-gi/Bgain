export type Role = 'ADMIN' | 'VIEWER';

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type AuthStateStatus = 'restoring' | 'unauthenticated' | 'authenticated';

export type AuthContextValue = {
  status: AuthStateStatus;
  user: SafeUser | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
};
