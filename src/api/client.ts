// src/api/client.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// CSRF token storage
let csrfToken: string | null = null;

export const setCsrfToken = (token: string): void => {
  csrfToken = token;
};

export const getCsrfToken = (): string | null => {
  return csrfToken;
};

export const clearCsrfToken = (): void => {
  csrfToken = null;
};

// Get current cinema ID from localStorage
export const getCurrentCinemaId = (): string | null => {
  return localStorage.getItem('selected_cinema_id');
};

// Create axios instance with credentials for session cookies
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// Request interceptor - add CSRF token and cinema header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add CSRF token for non-GET requests
    if (csrfToken && config.method && config.method.toLowerCase() !== 'get') {
      config.headers['X-CSRFToken'] = csrfToken;
    }

    // Add cinema header for multi-tenant requests
    const cinemaId = getCurrentCinemaId();
    if (cinemaId) {
      config.headers['X-Cinema-ID'] = cinemaId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 by redirecting to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // If 401 and not already on login page, redirect to login
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      clearCsrfToken();
      localStorage.removeItem('selected_cinema_id');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
