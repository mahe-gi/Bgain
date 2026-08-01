import React, { useState, useEffect, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SafeUser } from "../types/auth.js";
import { AuthContext, type AuthContextType } from "./auth-context.js";
import * as authApi from "../api/auth.api.js";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("accessToken"));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const queryClient = useQueryClient();

  // Session restoration on startup
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedToken = sessionStorage.getItem("accessToken");
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const { user: fetchedUser } = await authApi.getMeApi();
        if (isMounted) {
          setUser(fetchedUser);
          setToken(storedToken);
          setIsLoading(false);
        }
      } catch {
        // Clear invalid or expired session
        sessionStorage.removeItem("accessToken");
        if (isMounted) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.loginApi(email, password);
    sessionStorage.setItem("accessToken", data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("accessToken");
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
