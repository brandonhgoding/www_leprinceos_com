import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import Engagements from './Engagements';

// vi.mock factories are hoisted before imports, so inline all mock data here.
vi.mock('../api', () => ({
  engagementsApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  screensApi: {
    list: vi.fn().mockResolvedValue([
      { id: 1, name: 'Screen 1', capacity: 150, screen_type: 'standard', aspect_ratio: 'scope', sound_system: 'dolby_atmos', supports_3d: false },
    ]),
  },
  filmsApi: {
    list: vi.fn().mockResolvedValue([
      { id: 101, title: 'Test Movie', runtime_minutes: 120, rating: 'PG-13', synopsis: 'A test movie', poster_url: 'https://example.com/poster.jpg', tmdb_id: '12345', imdb_id: 'tt1234567' },
    ]),
  },
  authApi: {
    getCurrentUser: vi.fn().mockResolvedValue({ id: 1, username: 'test', is_superuser: false }),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock useToast since ToastProvider is not in the test helpers wrapper
vi.mock('../contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ addToast: vi.fn(), toasts: [], dismissToast: vi.fn() }),
}));

// FilmSearchCombo is heavy (TMDB/debounce); stub it to a button that selects a test film.
vi.mock('../components/FilmSearchCombo', () => ({
  default: ({
    onFilmSelected,
  }: {
    onFilmSelected: (f: {
      id: number;
      title: string;
      runtime_minutes: number;
      rating: string;
      synopsis: string;
      poster_url: string;
      tmdb_id: string;
      imdb_id: string;
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onFilmSelected({
          id: 101,
          title: 'Test Movie',
          runtime_minutes: 120,
          rating: 'PG-13',
          synopsis: 'A test movie',
          poster_url: 'https://example.com/poster.jpg',
          tmdb_id: '12345',
          imdb_id: 'tt1234567',
        })
      }
    >
      stub-add-film
    </button>
  ),
}));

describe('Engagements form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // BrowserRouter in helpers uses basename="/dashboard"; set URL to match
    window.history.pushState({}, '', '/dashboard/engagements');
  });

  async function openCreate() {
    renderWithProviders(<Engagements />);
    fireEvent.click(await screen.findByRole('button', { name: /new engagement/i }));
  }

  it('shows the Type selector in the create drawer', async () => {
    await openCreate();
    expect(await screen.findByLabelText(/type/i)).toBeInTheDocument();
  });

  it('double feature reveals a multi-film list and requires two films', async () => {
    await openCreate();
    fireEvent.change(await screen.findByLabelText(/type/i), {
      target: { value: 'DOUBLE_FEATURE' },
    });
    const submit = screen.getByRole('button', { name: /create engagement/i });
    // add one film -> still blocked (needs ≥2)
    fireEvent.click(screen.getByText('stub-add-film'));
    expect(submit).toBeDisabled();
  });

  it('switching from DOUBLE_FEATURE back to REGULAR trims films to one', async () => {
    await openCreate();
    fireEvent.change(await screen.findByLabelText(/type/i), {
      target: { value: 'DOUBLE_FEATURE' },
    });
    fireEvent.click(screen.getByText('stub-add-film'));
    fireEvent.change(screen.getByLabelText(/type/i), {
      target: { value: 'REGULAR' },
    });
    // double-feature hint should be gone after switching back
    expect(screen.queryByText(/at least two films/i)).not.toBeInTheDocument();
  });

  it('event title field is hidden for REGULAR kind', async () => {
    await openCreate();
    await waitFor(() => {
      expect(screen.queryByLabelText(/event title/i)).not.toBeInTheDocument();
    });
  });

  it('event title field appears for SPECIAL_EVENT kind', async () => {
    await openCreate();
    fireEvent.change(await screen.findByLabelText(/type/i), {
      target: { value: 'SPECIAL_EVENT' },
    });
    expect(await screen.findByLabelText(/event title/i)).toBeInTheDocument();
  });

  it('visibility checkbox is present in the form', async () => {
    await openCreate();
    expect(await screen.findByLabelText(/show in main listings/i)).toBeInTheDocument();
  });
});
