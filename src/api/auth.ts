// src/api/auth.ts
import apiClient, { setTokens, clearTokens } from './client';

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

export interface TokenResponse {
  access: string;
  refresh: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    // Get tokens
    const tokenResponse = await apiClient.post<TokenResponse>('/auth/token/', credentials);
    setTokens(tokenResponse.data.access, tokenResponse.data.refresh);

    // Get user info
    const userResponse = await apiClient.get<User>('/v1/me/');
    return userResponse.data;
  },

  logout: (): void => {
    clearTokens();
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/v1/me/');
    return response.data;
  },

  refreshToken: async (refresh: string): Promise<string> => {
    const response = await apiClient.post<{ access: string }>('/auth/token/refresh/', {
      refresh,
    });
    return response.data.access;
  },
};

export default authApi;
