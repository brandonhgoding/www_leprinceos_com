import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authApi } from './auth';
import apiClient, { setCsrfToken, clearCsrfToken } from './client';
import type { LoginResponse, User } from './auth';

// Mock the apiClient
vi.mock('./client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setCsrfToken: vi.fn(),
  clearCsrfToken: vi.fn(),
  getCsrfToken: vi.fn(),
}));

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    is_superuser: false,
  };

  describe('login', () => {
    it('should login successfully and store CSRF token', async () => {
      const loginResponse: LoginResponse = {
        user: mockUser,
        csrfToken: 'test-csrf-token',
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: loginResponse });

      const result = await authApi.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/v1/auth/login/', {
        username: 'testuser',
        password: 'password123',
      });
      expect(setCsrfToken).toHaveBeenCalledWith('test-csrf-token');
      expect(result).toEqual(mockUser);
    });

    it('should handle login failure', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(apiClient.post).mockRejectedValue(error);

      await expect(authApi.login({ username: 'wrong', password: 'wrong' })).rejects.toThrow(
        'Invalid credentials',
      );

      expect(setCsrfToken).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(apiClient.post).mockRejectedValue(networkError);

      await expect(
        authApi.login({ username: 'testuser', password: 'password123' }),
      ).rejects.toThrow('Network Error');
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear tokens', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await authApi.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/v1/auth/logout/');
      expect(clearCsrfToken).toHaveBeenCalled();
    });

    it('should clear local state even if API call fails', async () => {
      const error = new Error('Server error');
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);

      // authApi.logout will throw the error but still clears state in finally block
      await expect(authApi.logout()).rejects.toThrow('Server error');

      // State should still be cleared even though error was thrown
      expect(clearCsrfToken).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(apiClient.post).mockRejectedValueOnce(networkError);

      // authApi.logout will throw but still clears state
      await expect(authApi.logout()).rejects.toThrow('Network Error');

      // State should still be cleared even though error was thrown
      expect(clearCsrfToken).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user successfully', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockUser });

      const result = await authApi.getCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/v1/auth/me/');
      expect(result).toEqual(mockUser);
    });

    it('should handle unauthorized error', async () => {
      const error = new Error('Unauthorized');
      vi.mocked(apiClient.get).mockRejectedValue(error);

      await expect(authApi.getCurrentUser()).rejects.toThrow('Unauthorized');
    });

    it('should handle superuser', async () => {
      const superUser: User = {
        ...mockUser,
        is_superuser: true,
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: superUser });

      const result = await authApi.getCurrentUser();

      expect(result.is_superuser).toBe(true);
    });
  });
});
