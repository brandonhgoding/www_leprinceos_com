// src/api/client.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Get CSRF token from Django's cookie
const getCsrfTokenFromCookie = (): string | null => {
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue;
    }
  }
  return null;
};

// CSRF token storage (fallback for programmatic setting)
let csrfToken: string | null = null;

export const setCsrfToken = (token: string): void => {
  csrfToken = token;
};

export const getCsrfToken = (): string | null => {
  // Prefer cookie, fall back to stored token
  return getCsrfTokenFromCookie() || csrfToken;
};

export const clearCsrfToken = (): void => {
  csrfToken = null;
};

// Create axios instance with credentials for session cookies
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// Request interceptor - add CSRF token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add CSRF token for non-GET requests
    const token = getCsrfToken();
    if (token && config.method && config.method.toLowerCase() !== 'get') {
      config.headers['X-CSRFToken'] = token;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - handle 401 by redirecting to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // If 401 and not already on login page, redirect to login
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      clearCsrfToken();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default apiClient;
