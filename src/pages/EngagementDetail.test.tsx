import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import EngagementDetail from './EngagementDetail';

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ id: '7' }),
}));

// Mock useToast since ToastProvider is not in the test helpers wrapper
vi.mock('../contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ addToast: vi.fn(), toasts: [], dismissToast: vi.fn() }),
}));

// vi.mock factories are hoisted before imports; inline all mock data here.
vi.mock('../api', () => ({
  engagementsApi: {
    get: vi.fn().mockResolvedValue({
      id: 7,
      kind: 'DOUBLE_FEATURE',
      event_title: 'Creature Double Feature',
      display_title: 'Creature Double Feature',
      films: [
        {
          id: 101,
          title: 'Test Movie',
          runtime_minutes: 120,
          rating: 'PG-13',
          synopsis: 'A test movie synopsis',
          poster_url: 'https://example.com/poster.jpg',
          tmdb_id: '12345',
          imdb_id: 'tt1234567',
        },
        {
          id: 102,
          title: 'Second Film',
          runtime_minutes: 90,
          rating: 'PG',
          synopsis: 'Second film synopsis',
          poster_url: 'https://example.com/poster2.jpg',
          tmdb_id: '67890',
          imdb_id: 'tt7654321',
        },
      ],
      film_title: 'Test Movie',
      film_poster_url: 'https://example.com/poster.jpg',
      screen: 1,
      screen_name: 'Screen 1',
      start_date: '2026-10-31',
      end_date: '2026-10-31',
      presentation_format: '2d',
      status: 'CONFIRMED',
      show_in_main_listings: false,
      notes: '',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    }),
  },
  showtimesApi: { list: vi.fn().mockResolvedValue([]) },
  filmsApi: { get: vi.fn(), list: vi.fn().mockResolvedValue([]) },
  authApi: {
    getCurrentUser: vi.fn().mockResolvedValue({ id: 1, username: 'test', is_superuser: false }),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('EngagementDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/dashboard/engagements/7');
  });

  it('renders the combined title and all films of a double feature', async () => {
    renderWithProviders(<EngagementDetail />);
    // Title appears in the page heading (h1) and film card heading (h3)
    expect((await screen.findAllByText('Creature Double Feature')).length).toBeGreaterThan(0);
    // Both films of the double feature must appear in the film list
    expect(await screen.findByText('Second Film')).toBeInTheDocument();
  });
});
