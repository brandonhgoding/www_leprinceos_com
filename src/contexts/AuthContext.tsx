/* eslint-disable react-refresh/only-export-components */
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, type User } from '../api';
import { clearCsrfToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isManager: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount by trying to get current user
  useEffect(() => {
    const checkSession = async () => {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      } catch {
        // No valid session - user not authenticated
        setUser(null);
        clearCsrfToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const userData = await authApi.login({ username, password });
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const isManager = !!user?.is_superuser;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isManager,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
