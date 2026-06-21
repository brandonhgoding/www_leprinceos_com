// src/api/auth.ts
import apiClient, { setCsrfToken, clearCsrfToken } from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
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
    setCsrfToken(response.data.csrfToken);
    return response.data.user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/v1/auth/logout/');
    } finally {
      clearCsrfToken();
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/v1/auth/me/');
    return response.data;
  },
};

export default authApi;
