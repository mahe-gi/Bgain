import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './auth-context';
import type { AuthStateStatus, SafeUser } from '../types/auth';
import {
  getAccessToken,
  saveAccessToken,
  clearAccessToken,
  setMemoryAccessToken,
} from '../services/token.service';
import { loginApi, getMeApi } from '../api/auth.api';
import { registerUnauthorizedHandler, resetUnauthorizedState, getErrorMessage } from '../api/client';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStateStatus>('restoring');
  const [user, setUser] = useState<SafeUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleUnauthorized = useCallback(async () => {
    await clearAccessToken();
    setUser(null);
    setStatus('unauthenticated');
    queryClient.clear();
    resetUnauthorizedState();
  }, [queryClient]);

  // Register protected 401 callback
  useEffect(() => {
    registerUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  // Restore session on application startup
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const storedToken = await getAccessToken();
        if (!storedToken) {
          if (isMounted) {
            setStatus('unauthenticated');
          }
          return;
        }

        setMemoryAccessToken(storedToken);
        const meData = await getMeApi();

        if (isMounted) {
          setUser(meData.user);
          setStatus('authenticated');
        }
      } catch {
        await clearAccessToken();
        if (isMounted) {
          setUser(null);
          setStatus('unauthenticated');
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, pass: string): Promise<void> => {
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const loginData = await loginApi(cleanEmail, pass);
      await saveAccessToken(loginData.accessToken);
      setUser(loginData.user);
      setStatus('authenticated');
      resetUnauthorizedState();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to log in. Please try again.');
      setError(msg);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    setError(null);
    await clearAccessToken();
    setUser(null);
    setStatus('unauthenticated');
    queryClient.clear();
    resetUnauthorizedState();
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        login,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
