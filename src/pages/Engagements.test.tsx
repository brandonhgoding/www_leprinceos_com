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

// Mutable registry so individual tests can queue distinct films for the stub to emit.
// Each click pops from the front; falls back to the default film (id 101) if the queue is empty.
const stubFilmQueue: Array<{
  id: number;
  title: string;
  runtime_minutes: number;
  rating: string;
  synopsis: string;
  poster_url: string;
  tmdb_id: string;
  imdb_id: string;
}> = [];

const defaultStubFilm = {
  id: 101,
  title: 'Test Movie',
  runtime_minutes: 120,
  rating: 'PG-13',
  synopsis: 'A test movie',
  poster_url: 'https://example.com/poster.jpg',
  tmdb_id: '12345',
  imdb_id: 'tt1234567',
};

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
      onClick={() => {
        const film = stubFilmQueue.length > 0 ? stubFilmQueue.shift()! : defaultStubFilm;
        onFilmSelected(film);
      }}
    >
      stub-add-film
    </button>
  ),
}));

const mockFilm = defaultStubFilm;

describe('Engagements list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubFilmQueue.length = 0;
    window.history.pushState({}, '', '/dashboard/engagements');
  });

  it('renders display_title and a type badge for special screenings', async () => {
    const { engagementsApi } = await import('../api');
    vi.mocked(engagementsApi.list).mockResolvedValue([
      {
        id: 7,
        kind: 'DOUBLE_FEATURE',
        event_title: 'Creature Double Feature',
        display_title: 'Creature Double Feature',
        films: [mockFilm, { ...mockFilm, id: 102, title: 'Second Film' }],
        film_title: mockFilm.title,
        film_poster_url: mockFilm.poster_url,
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
      },
    ]);
    renderWithProviders(<Engagements />);
    expect(await screen.findAllByText('Creature Double Feature')).not.toHaveLength(0);
    expect(screen.getAllByText(/double feature/i).length).toBeGreaterThan(0);
  });
});

describe('Engagements form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Drain any queued stub films left over from a previous test.
    stubFilmQueue.length = 0;
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

  it('REGULAR engagement: create is called with correct payload shape', async () => {
    const { engagementsApi } = await import('../api');
    await openCreate();

    // Select screen
    fireEvent.change(await screen.findByLabelText(/screen/i), { target: { value: '1' } });
    // Set dates
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2026-07-01' },
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2026-07-14' },
    });
    // Add one film (default stub: id 101)
    fireEvent.click(screen.getByText('stub-add-film'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /create engagement/i }));

    await waitFor(() => {
      expect(engagementsApi.create).toHaveBeenCalledTimes(1);
    });

    const payload = vi.mocked(engagementsApi.create).mock.calls[0][0];
    expect(payload.films).toEqual([101]);
    expect(payload.kind).toBe('REGULAR');
    expect(payload.show_in_main_listings).toBe(true);
    // event_title must be omitted (not sent) when left blank
    expect(payload.event_title).toBeUndefined();
  });

  it('DOUBLE_FEATURE engagement: create is called with two distinct film ids and event_title', async () => {
    const { engagementsApi } = await import('../api');
    await openCreate();

    // Switch kind to DOUBLE_FEATURE
    fireEvent.change(await screen.findByLabelText(/type/i), {
      target: { value: 'DOUBLE_FEATURE' },
    });

    // Select screen
    fireEvent.change(screen.getByLabelText(/screen/i), { target: { value: '1' } });
    // Set dates
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2026-08-01' },
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2026-08-02' },
    });

    // Set an event title (visible for non-REGULAR kinds)
    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: 'Creature Double Feature' },
    });

    // Queue two distinct films so the stub emits different ids on each click
    stubFilmQueue.push(
      { id: 101, title: 'Test Movie', runtime_minutes: 120, rating: 'PG-13', synopsis: 'A test movie', poster_url: 'https://example.com/poster.jpg', tmdb_id: '12345', imdb_id: 'tt1234567' },
      { id: 102, title: 'Second Movie', runtime_minutes: 90, rating: 'PG', synopsis: 'Another test movie', poster_url: 'https://example.com/poster2.jpg', tmdb_id: '67890', imdb_id: 'tt7654321' },
    );

    fireEvent.click(screen.getByText('stub-add-film'));
    fireEvent.click(screen.getByText('stub-add-film'));

    // With two films the submit button should now be enabled
    const submit = screen.getByRole('button', { name: /create engagement/i });
    expect(submit).not.toBeDisabled();

    fireEvent.click(submit);

    await waitFor(() => {
      expect(engagementsApi.create).toHaveBeenCalledTimes(1);
    });

    const payload = vi.mocked(engagementsApi.create).mock.calls[0][0];
    expect(payload.films).toEqual([101, 102]);
    expect(payload.kind).toBe('DOUBLE_FEATURE');
    expect(payload.event_title).toBe('Creature Double Feature');
  });
});
