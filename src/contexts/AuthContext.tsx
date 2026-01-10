// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, type User, type CinemaMembership, getAccessToken, clearTokens } from '../api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  currentCinema: CinemaMembership | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  selectCinema: (cinemaId: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentCinema, setCurrentCinema] = useState<CinemaMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);

        // Restore selected cinema from localStorage or use first cinema
        const savedCinemaId = localStorage.getItem('selected_cinema_id');
        if (savedCinemaId) {
          const cinema = userData.cinemas.find(c => c.cinema_id === parseInt(savedCinemaId));
          setCurrentCinema(cinema || userData.cinemas[0] || null);
        } else if (userData.cinemas.length > 0) {
          setCurrentCinema(userData.cinemas[0]);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const userData = await authApi.login({ username, password });
    setUser(userData);

    // Set initial cinema
    if (userData.cinemas.length > 0) {
      setCurrentCinema(userData.cinemas[0]);
      localStorage.setItem('selected_cinema_id', String(userData.cinemas[0].cinema_id));
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setCurrentCinema(null);
    localStorage.removeItem('selected_cinema_id');
  }, []);

  const selectCinema = useCallback((cinemaId: number) => {
    if (!user) return;

    const cinema = user.cinemas.find(c => c.cinema_id === cinemaId);
    if (cinema) {
      setCurrentCinema(cinema);
      localStorage.setItem('selected_cinema_id', String(cinemaId));
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    currentCinema,
    login,
    logout,
    selectCinema,
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
