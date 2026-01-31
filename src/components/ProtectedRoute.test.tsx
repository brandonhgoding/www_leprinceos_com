import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';
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

// Mock the client module
vi.mock('../api/client', () => ({
  clearCsrfToken: vi.fn(),
  setCsrfToken: vi.fn(),
  getCsrfToken: vi.fn(),
  getCurrentCinemaId: vi.fn(),
  apiClient: {},
}));

describe('ProtectedRoute Component', () => {
  let queryClient: QueryClient;
  let originalLocation: Location;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Save original location
    originalLocation = window.location;
    // Mock window.location
    delete (window as any).location;
    window.location = { ...originalLocation, href: '', pathname: '/dashboard/home' } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/dashboard">
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  describe('Loading State', () => {
    it('should show loading state while checking authentication', () => {
      vi.mocked(authApi.getCurrentUser).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { wrapper }
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should have correct loading state styling', () => {
      vi.mocked(authApi.getCurrentUser).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { container } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { wrapper }
      );

      const loadingContainer = screen.getByText('Loading...').parentElement;
      expect(loadingContainer).toHaveStyle({
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });
    });
  });

  describe('Authenticated User', () => {
    it('should render children when user is authenticated', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { wrapper }
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should render complex children when authenticated', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      render(
        <ProtectedRoute>
          <div>
            <h1>Dashboard</h1>
            <button>Action</button>
            <p>Welcome to the dashboard</p>
          </div>
        </ProtectedRoute>,
        { wrapper }
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
      expect(screen.getByText('Welcome to the dashboard')).toBeInTheDocument();
    });
  });

  describe('Unauthenticated User', () => {
    it('should not render protected content when user is not authenticated', async () => {
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'));

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { wrapper }
      );

      // Component redirects, so protected content should not be rendered
      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('should return null when redirecting', async () => {
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'));

      const { container } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { wrapper }
      );

      // After loading completes, component returns null (redirects)
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('Authentication State Changes', () => {
    it('should re-check authentication on remount', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { unmount } = render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { wrapper }
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      unmount();

      // Re-render with same auth state
      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { wrapper }
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      const { container } = render(<ProtectedRoute>{null}</ProtectedRoute>, { wrapper });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should render without errors
      expect(container).toBeInTheDocument();
    });

    it('should handle multiple child elements', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      render(
        <ProtectedRoute>
          <div>First Child</div>
          <div>Second Child</div>
          <div>Third Child</div>
        </ProtectedRoute>,
        { wrapper }
      );

      await waitFor(() => {
        expect(screen.getByText('First Child')).toBeInTheDocument();
      });

      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Third Child')).toBeInTheDocument();
    });

    it('should handle API errors during authentication check', async () => {
      const error = new Error('Network Error');
      vi.mocked(authApi.getCurrentUser).mockRejectedValue(error);

      render(
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>,
        { wrapper }
      );

      // Should not render protected content on errors
      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });
});
