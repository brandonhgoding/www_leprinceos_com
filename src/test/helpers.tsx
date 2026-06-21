/* eslint-disable react-refresh/only-export-components */
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ConfirmProvider } from '../contexts/ConfirmContext';

// Create a new QueryClient for each test to ensure isolation
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: 0, // Disable garbage collection
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

// Wrapper with all providers needed for testing
export function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter basename="/dashboard">
        <ConfirmProvider>
          <AuthProvider>{children}</AuthProvider>
        </ConfirmProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Custom render function that includes all providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient },
) {
  const { queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => <AllProviders queryClient={queryClient}>{children}</AllProviders>,
    ...renderOptions,
  });
}

// Mock user data for testing
export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  is_superuser: false,
};

// Mock engagement data
export const mockEngagement = {
  id: 1,
  film: 101,
  film_title: 'Test Movie',
  film_poster_url: 'https://example.com/poster.jpg',
  screen: 1,
  screen_name: 'Screen 1',
  start_date: '2026-02-01',
  end_date: '2026-02-07',
  presentation_format: '2d' as const,
  status: 'CONFIRMED' as const,
  notes: 'Test notes',
  is_active: true,
  created_at: '2026-01-20T10:00:00Z',
};

// Mock showtime data
export const mockShowtime = {
  id: 1,
  engagement: 1,
  screen: 1,
  screen_name: 'Screen 1',
  starts_at: '2026-02-01T19:00:00-05:00',
  is_cancelled: false,
  captions: null,
  film_title: 'Test Movie',
  film_poster_url: 'https://example.com/poster.jpg',
  is_outside_engagement_range: false,
  presentation_format: '2d' as const,
  presentation_format_display: '2D',
};

// Mock screen data
export const mockScreen = {
  id: 1,
  name: 'Screen 1',
  capacity: 150,
  screen_type: 'standard' as const,
  aspect_ratio: 'scope' as const,
  sound_system: 'dolby_atmos' as const,
  supports_3d: false,
};

// Mock film data
export const mockFilm = {
  id: 101,
  title: 'Test Movie',
  runtime_minutes: 120,
  rating: 'PG-13',
  synopsis: 'A test movie synopsis',
  poster_url: 'https://example.com/poster.jpg',
  tmdb_id: '12345',
  imdb_id: 'tt1234567',
};

// Wait for loading states to resolve
export const waitForLoadingToFinish = () => new Promise((resolve) => setTimeout(resolve, 0));
