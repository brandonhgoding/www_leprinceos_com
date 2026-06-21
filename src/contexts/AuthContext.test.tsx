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
    });

    it('should set user to null when no session exists', async () => {
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Login', () => {
    it('should login user successfully', async () => {
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
      expect(result.current.isAuthenticated).toBe(false);
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
        isManager: false,
      });

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');

      expect(Object.keys(result.current).sort()).toEqual(
        ['isAuthenticated', 'isLoading', 'isManager', 'login', 'logout', 'user'].sort(),
      );
    });

    it('should set isManager true for a superuser', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue({ ...mockUser, is_superuser: true });
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isManager).toBe(true);
    });
  });
});
