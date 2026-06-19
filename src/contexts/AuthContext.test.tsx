import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';
import { authApi } from '../api';
import { mockUser } from '../test/helpers';

// Mock the auth API
vi.mock('../api', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock the client module to avoid interceptor issues
vi.mock('../api/client', () => ({
  clearCsrfToken: vi.fn(),
  setCsrfToken: vi.fn(),
  getCsrfToken: vi.fn(),
  getCurrentCinemaId: vi.fn(),
  apiClient: {},
}));

describe('AuthContext', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });
  });

  describe('Authentication State', () => {
    it('should start with loading state', () => {
      vi.mocked(authApi.getCurrentUser).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should load user on mount when session exists', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.currentCinema).toEqual(mockUser.cinemas[0]);
    });

    it('should set user to null when no session exists', async () => {
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.currentCinema).toBeNull();
    });

    it('stays authenticated when the API user has no cinemas (single-tenant)', async () => {
      // Regression: the de-tenanted API no longer returns `cinemas`. Unguarded
      // access to userData.cinemas threw, was swallowed as "no session", and
      // caused an infinite login redirect loop.
      const { cinemas: _omit, ...userWithoutCinemas } = mockUser;
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(
        userWithoutCinemas as typeof mockUser,
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.currentCinema).toBeNull();
    });
  });

  describe('Cinema Selection', () => {
    it('should restore selected cinema from localStorage', async () => {
      localStorage.setItem('selected_cinema_id', '2');
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentCinema?.cinema_id).toBe(2);
      expect(result.current.currentCinema?.cinema_name).toBe('Second Cinema');
    });

    it('should fall back to first cinema if saved cinema not found', async () => {
      localStorage.setItem('selected_cinema_id', '999');
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentCinema?.cinema_id).toBe(1);
    });

    it('should use first cinema when no cinema is saved', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentCinema?.cinema_id).toBe(1);
      expect(localStorage.getItem('selected_cinema_id')).toBe('1');
    });

    it('should allow switching cinemas', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Switch to second cinema
      result.current.selectCinema(2);

      await waitFor(() => {
        expect(result.current.currentCinema?.cinema_id).toBe(2);
      });
      expect(localStorage.getItem('selected_cinema_id')).toBe('2');
    });

    it('should not switch to invalid cinema ID', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalCinema = result.current.currentCinema;

      // Try to switch to non-existent cinema
      result.current.selectCinema(999);

      expect(result.current.currentCinema).toEqual(originalCinema);
    });

    it('should not switch cinemas when user is null', async () => {
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      result.current.selectCinema(1);

      expect(result.current.currentCinema).toBeNull();
    });
  });

  describe('Login', () => {
    it('should login user and set current cinema', async () => {
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'));
      vi.mocked(authApi.login).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.login('testuser', 'password123');

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(authApi.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.currentCinema?.cinema_id).toBe(1);
      expect(localStorage.getItem('selected_cinema_id')).toBe('1');
    });

    it('should handle login with no cinemas', async () => {
      const userWithNoCinemas = { ...mockUser, cinemas: [] };
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'));
      vi.mocked(authApi.login).mockResolvedValue(userWithNoCinemas);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.login('testuser', 'password123');

      await waitFor(() => {
        expect(result.current.user).toEqual(userWithNoCinemas);
      });
      expect(result.current.currentCinema).toBeNull();
    });

    it('should throw error on failed login', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'));
      vi.mocked(authApi.login).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(result.current.login('wrong', 'creds')).rejects.toThrow('Invalid credentials');
      expect(result.current.user).toBeNull();
    });
  });

  describe('Logout', () => {
    it('should logout user and clear state', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(authApi.logout).mockResolvedValue();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).not.toBeNull();

      await result.current.logout();

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });

      expect(authApi.logout).toHaveBeenCalled();
      expect(result.current.currentCinema).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should call logout API', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(authApi.logout).mockResolvedValue();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.logout();

      await waitFor(() => {
        expect(authApi.logout).toHaveBeenCalled();
        expect(result.current.user).toBeNull();
      });

      expect(result.current.currentCinema).toBeNull();
    });
  });

  describe('Context Value', () => {
    it('should provide correct context values', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toMatchObject({
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
        currentCinema: mockUser.cinemas[0],
      });

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.selectCinema).toBe('function');
    });
  });
});
