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
  getCurrentCinemaId: vi.fn(),
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
    cinemas: [
      {
        cinema_id: 1,
        cinema_name: 'Test Cinema',
        cinema_slug: 'test-cinema',
        cinema_timezone: 'America/New_York',
        is_manager: true,
      },
    ],
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
      localStorage.setItem('selected_cinema_id', '123');

      await authApi.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/v1/auth/logout/');
      expect(clearCsrfToken).toHaveBeenCalled();
      expect(localStorage.getItem('selected_cinema_id')).toBeNull();
    });

    it('should clear local state even if API call fails', async () => {
      const error = new Error('Server error');
      vi.mocked(apiClient.post).mockRejectedValueOnce(error);
      localStorage.setItem('selected_cinema_id', '123');

      // authApi.logout will throw the error but still clears state in finally block
      await expect(authApi.logout()).rejects.toThrow('Server error');

      // State should still be cleared even though error was thrown
      expect(clearCsrfToken).toHaveBeenCalled();
      expect(localStorage.getItem('selected_cinema_id')).toBeNull();
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

    it('should handle user with multiple cinemas', async () => {
      const userWithMultipleCinemas: User = {
        ...mockUser,
        cinemas: [
          {
            cinema_id: 1,
            cinema_name: 'First Cinema',
            cinema_slug: 'first-cinema',
            cinema_timezone: 'America/New_York',
            is_manager: true,
          },
          {
            cinema_id: 2,
            cinema_name: 'Second Cinema',
            cinema_slug: 'second-cinema',
            cinema_timezone: 'America/Los_Angeles',
            is_manager: false,
          },
        ],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: userWithMultipleCinemas });

      const result = await authApi.getCurrentUser();

      expect(result.cinemas).toHaveLength(2);
      expect(result.cinemas?.[0].cinema_name).toBe('First Cinema');
      expect(result.cinemas?.[1].cinema_name).toBe('Second Cinema');
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

    it('should handle user with no cinemas', async () => {
      const userWithNoCinemas: User = {
        ...mockUser,
        cinemas: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: userWithNoCinemas });

      const result = await authApi.getCurrentUser();

      expect(result.cinemas).toHaveLength(0);
    });
  });
});
