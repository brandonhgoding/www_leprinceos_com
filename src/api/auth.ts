// src/api/auth.ts
import apiClient, { setCsrfToken, clearCsrfToken } from './client';

export interface CinemaMembership {
  cinema_id: number;
  cinema_name: string;
  cinema_slug: string;
  cinema_timezone: string;
  is_manager: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  cinemas: CinemaMembership[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  csrfToken: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    const response = await apiClient.post<LoginResponse>('/v1/auth/login/', credentials);
    // Store CSRF token for future requests
    setCsrfToken(response.data.csrfToken);
    return response.data.user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/v1/auth/logout/');
    } finally {
      // Clear local state regardless of API response
      clearCsrfToken();
      localStorage.removeItem('selected_cinema_id');
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/v1/auth/me/');
    return response.data;
  },
};

export default authApi;
