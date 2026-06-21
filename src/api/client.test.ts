import { describe, it, expect, beforeEach } from 'vitest';
import { getCsrfToken, setCsrfToken, clearCsrfToken } from './client';

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
});
