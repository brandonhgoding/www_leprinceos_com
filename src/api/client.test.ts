import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCsrfToken,
  setCsrfToken,
  clearCsrfToken,
  getCurrentCinemaId,
} from './client';

describe('API Client Helper Functions', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Clear cookies
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  describe('CSRF Token Management', () => {
    it('should get CSRF token from cookie', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrftoken=test-csrf-token; other=value',
      });

      const token = getCsrfToken();
      expect(token).toBe('test-csrf-token');
    });

    it('should return null when CSRF cookie is not set', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'other=value',
      });

      const token = getCsrfToken();
      expect(token).toBeNull();
    });

    it('should set and get CSRF token programmatically', () => {
      setCsrfToken('programmatic-token');
      const token = getCsrfToken();
      expect(token).toBe('programmatic-token');
    });

    it('should prefer cookie over programmatic token', () => {
      setCsrfToken('programmatic-token');
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'csrftoken=cookie-token',
      });

      const token = getCsrfToken();
      expect(token).toBe('cookie-token');
    });

    it('should clear CSRF token', () => {
      setCsrfToken('test-token');
      expect(getCsrfToken()).toBe('test-token');

      clearCsrfToken();
      expect(getCsrfToken()).toBeNull();
    });

    it('should handle multiple cookies correctly', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'session=abc123; csrftoken=my-token; user=john',
      });

      const token = getCsrfToken();
      expect(token).toBe('my-token');
    });

    it('should handle cookie with spaces', () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: ' csrftoken=token-with-space ; other=value',
      });

      const token = getCsrfToken();
      expect(token).toBe('token-with-space');
    });
  });

  describe('Cinema ID Management', () => {
    it('should get cinema ID from localStorage', () => {
      localStorage.setItem('selected_cinema_id', '123');
      const cinemaId = getCurrentCinemaId();
      expect(cinemaId).toBe('123');
    });

    it('should return null when cinema ID is not set', () => {
      const cinemaId = getCurrentCinemaId();
      expect(cinemaId).toBeNull();
    });

    it('should get updated cinema ID after change', () => {
      localStorage.setItem('selected_cinema_id', '123');
      expect(getCurrentCinemaId()).toBe('123');

      localStorage.setItem('selected_cinema_id', '456');
      expect(getCurrentCinemaId()).toBe('456');
    });

    it('should return null after cinema ID is removed', () => {
      localStorage.setItem('selected_cinema_id', '123');
      expect(getCurrentCinemaId()).toBe('123');

      localStorage.removeItem('selected_cinema_id');
      expect(getCurrentCinemaId()).toBeNull();
    });
  });

  describe('Token and Cinema ID Integration', () => {
    it('should manage both CSRF token and cinema ID independently', () => {
      setCsrfToken('csrf-token');
      localStorage.setItem('selected_cinema_id', '999');

      expect(getCsrfToken()).toBe('csrf-token');
      expect(getCurrentCinemaId()).toBe('999');

      clearCsrfToken();
      expect(getCsrfToken()).toBeNull();
      expect(getCurrentCinemaId()).toBe('999');
    });
  });
});
