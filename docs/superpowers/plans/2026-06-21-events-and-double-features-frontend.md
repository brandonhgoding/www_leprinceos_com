# Events & Double Features — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff create/manage special screenings (events, classics) and double features (ordered multi-film engagements) in the dashboard, fixing the now-broken `film`→`films` create contract.

**Architecture:** A small auth-aware backend tweak (staff see all; anonymous reads stay filtered) plus frontend changes: types, a Type-driven engagement form with an ordered multi-film list for double features, list/detail display of kind + combined title + visibility.

**Tech Stack:** React 18 + TypeScript + Vite, TanStack Query, axios, Vitest + React Testing Library. Backend: Django/DRF (`../api_leprinceos_com`).

## Global Constraints

- Frontend repo: `/Users/bgoding/code/SoftwareMaine/www_leprinceos_com`. Backend repo: `/Users/bgoding/code/SoftwareMaine/api_leprinceos_com`.
- Frontend focused test: `npx vitest run <path>`. Full: `npm run test:run`. Typecheck/build: `npm run build`. Lint: `npm run lint`.
- Backend tests: `./runtests <dotted.path>` (run api/v1 modules individually — the full `api.v1.tests` group trips a throttle bleed).
- `EngagementKind` literal union: `'REGULAR' | 'SPECIAL_EVENT' | 'CLASSIC' | 'DOUBLE_FEATURE'`.
- Visibility default by kind: `REGULAR` → true; `CLASSIC`/`SPECIAL_EVENT`/`DOUBLE_FEATURE` → false; overridable.
- Film-count rule (client-side, mirrors backend): non-double-feature → exactly 1 film; double feature → ≥2.
- Film order = the order films are added; no reorder UI.
- Backend staff check (mirror `cinemas.permissions.IsStaffOrReadOnly`): `bool(user and user.is_authenticated and user.is_staff)`.
- Spec: `docs/superpowers/specs/2026-06-21-events-and-double-features-frontend-design.md`.

---

## Task 1: Backend — auth-aware default-hide (api repo)

**Files:**
- Modify: `../api_leprinceos_com/api/v1/views/engagements.py` (`EngagementViewSet.get_queryset`)
- Modify: `../api_leprinceos_com/api/v1/views/showtimes.py` (`ShowtimeViewSet.get_queryset`)
- Test: `../api_leprinceos_com/api/v1/tests/test_api_engagements.py` (`EngagementListingVisibilityTests`), `../api_leprinceos_com/api/v1/tests/test_api_showtimes.py` (`ShowtimeListingVisibilityTests`)

**Interfaces:**
- Produces: list endpoints default-hide non-main-listing items ONLY for non-staff (anonymous) reads; authenticated staff get all; explicit `?show_in_main_listings=`/`?kind=` still filter for everyone.

- [ ] **Step 1: Update the visibility tests to the new semantics (write failing tests first)**

In `test_api_engagements.py`, replace the body of `EngagementListingVisibilityTests` so it covers anonymous-hides + staff-sees-all. Read the existing class first; it has `setUp` creating `self.regular` (visible) and `self.classic` (hidden) and authenticates staff. New methods:

```python
    def _ids(self, resp):
        data = resp.data["results"] if "results" in resp.data else resp.data
        return {e["id"] for e in data}

    def test_anonymous_default_list_hides_non_main_listing(self):
        self.client.force_authenticate(user=None)  # anonymous (GET is allowed)
        resp = self.client.get("/api/v1/engagements/")
        ids = self._ids(resp)
        self.assertIn(self.regular.id, ids)
        self.assertNotIn(self.classic.id, ids)

    def test_staff_default_list_returns_all(self):
        # setUp already authenticated staff; no kind/visibility params
        resp = self.client.get("/api/v1/engagements/")
        ids = self._ids(resp)
        self.assertIn(self.regular.id, ids)
        self.assertIn(self.classic.id, ids)

    def test_explicit_false_returns_hidden_items(self):
        resp = self.client.get("/api/v1/engagements/?show_in_main_listings=false")
        ids = self._ids(resp)
        self.assertIn(self.classic.id, ids)
        self.assertNotIn(self.regular.id, ids)
```

Apply the analogous change to `ShowtimeListingVisibilityTests` in `test_api_showtimes.py` (its `setUp` creates a showtime under a visible engagement and one under a hidden engagement; assert anonymous default hides the hidden one, staff default shows both, `?show_in_main_listings=false` returns the hidden one). Match that file's URL (`/api/v1/showtimes/`) and setup.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd ../api_leprinceos_com && ./runtests api.v1.tests.test_api_engagements.EngagementListingVisibilityTests`
Expected: FAIL — `test_staff_default_list_returns_all` fails because the current code hides for staff too.

- [ ] **Step 3: Make the default-hide auth-aware in both viewsets**

In `api/v1/views/engagements.py`, replace `EngagementViewSet.get_queryset`:

```python
    def get_queryset(self) -> QuerySet[Engagement]:
        qs = super().get_queryset()
        user = self.request.user
        is_staff = bool(user and user.is_authenticated and user.is_staff)
        params = self.request.query_params
        if (
            self.action == "list"
            and not is_staff
            and "show_in_main_listings" not in params
            and "kind" not in params
        ):
            qs = qs.filter(show_in_main_listings=True)
        return qs
```

In `api/v1/views/showtimes.py`, replace `ShowtimeViewSet.get_queryset` the same way, using `qs.filter(engagement__show_in_main_listings=True)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd ../api_leprinceos_com && ./runtests api.v1.tests.test_api_engagements.EngagementListingVisibilityTests api.v1.tests.test_api_showtimes.ShowtimeListingVisibilityTests`
Expected: PASS.

- [ ] **Step 5: Run both full modules + the default suite**

Run: `cd ../api_leprinceos_com && ./runtests api.v1.tests.test_api_engagements && ./runtests api.v1.tests.test_api_showtimes && ./runtests`
Expected: all green (engagements/showtimes modules + default ≈198).

- [ ] **Step 6: Commit (in the api repo)**

```bash
cd ../api_leprinceos_com
git add api/v1/views/engagements.py api/v1/views/showtimes.py api/v1/tests/test_api_engagements.py api/v1/tests/test_api_showtimes.py
git commit -m "feat(api): default-hide list visibility applies to anonymous reads only (staff see all)"
```

> **Note:** The api repo is on `main`. If you prefer a branch for this one-commit change, create `events-double-features-staff-visibility` first; otherwise committing to `main` matches how the prior feature was integrated. Confirm with the controller if unsure.

---

## Task 2: Frontend types + mocks (additive, non-breaking)

**Files:**
- Modify: `src/api/types.ts`
- Modify: `src/api/engagements.test.ts` (mock shape)
- Modify: `src/test/helpers.tsx` (`mockEngagement`)
- Test: `src/api/engagements.test.ts`

**Interfaces:**
- Produces: `EngagementKind`; `Engagement` with `kind`, `event_title`, `display_title`, `films: Film[]`, `show_in_main_listings` (and `film?` kept optional, transitional); `EngagementFilters` with `kind?`, `show_in_main_listings?`, `films?` (renamed from `film?`).
- Consumes: `Film` (existing).

- [ ] **Step 1: Update the API test mock to the new read shape (write failing expectation first)**

In `src/api/engagements.test.ts`, update `mockEngagement` to drop `film` and add the new fields, and add an assertion that the new fields survive the round-trip:

```ts
  const mockEngagement: Engagement = {
    id: 1,
    kind: 'REGULAR',
    event_title: '',
    display_title: 'Test Movie',
    films: [
      {
        id: 101,
        title: 'Test Movie',
        runtime_minutes: 120,
        rating: 'PG-13',
        synopsis: '',
        poster_url: 'https://example.com/poster.jpg',
        tmdb_id: '12345',
        imdb_id: 'tt1234567',
      },
    ],
    film_title: 'Test Movie',
    film_poster_url: 'https://example.com/poster.jpg',
    screen: 1,
    screen_name: 'Screen 1',
    start_date: '2026-02-01',
    end_date: '2026-02-07',
    presentation_format: '2d',
    status: 'CONFIRMED',
    show_in_main_listings: true,
    notes: 'Test notes',
    is_active: true,
    created_at: '2026-01-20T10:00:00Z',
  };
```

Also update the `filters` object in the "with filters" test that references `film: 101` → `films: 101` (and assert the query string contains `films=101`). Add a test that a `kind` filter serializes:

```ts
    it('should serialize kind and visibility filters', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockPaginatedResponse });
      await engagementsApi.list({ kind: 'DOUBLE_FEATURE', show_in_main_listings: false });
      const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0] as string;
      expect(calledUrl).toContain('kind=DOUBLE_FEATURE');
      expect(calledUrl).toContain('show_in_main_listings=false');
    });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/api/engagements.test.ts`
Expected: FAIL — `Engagement` mock has properties not on the type / `films` filter not recognized.

- [ ] **Step 3: Update `src/api/types.ts`**

```ts
export type EngagementKind = 'REGULAR' | 'SPECIAL_EVENT' | 'CLASSIC' | 'DOUBLE_FEATURE';

export interface Engagement {
  id: number;
  kind: EngagementKind;
  event_title: string;
  display_title: string;
  films: Film[];
  film?: number; // deprecated/transitional — removed from API; kept until consumers migrate
  film_title: string;
  film_poster_url: string | null;
  screen: number;
  screen_name: string;
  start_date: string;
  end_date: string;
  presentation_format: '2d' | '3d';
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'ENDED';
  show_in_main_listings: boolean;
  notes: string;
  is_active: boolean;
  created_at: string;
}
```

In `EngagementFilters`, replace `film?: number;` with `films?: number;` and add `kind?: string;` and `show_in_main_listings?: boolean;`. Leave `EngagementCreate` unchanged in this task (it is migrated in Task 3 alongside the form).

- [ ] **Step 4: Update `mockEngagement` in `src/test/helpers.tsx`**

Replace its `film: 101` with the new fields (mirror the Step 1 object): `kind: 'REGULAR'`, `event_title: ''`, `display_title: 'Test Movie'`, `films: [mockFilm]`, `show_in_main_listings: true`, and keep `film_title`/`film_poster_url`. (`mockFilm` is defined later in the same file — move `mockFilm` above `mockEngagement`, or inline the film object, so there is no use-before-declaration.)

- [ ] **Step 5: Run the API tests + typecheck**

Run: `npx vitest run src/api/engagements.test.ts && npm run build`
Expected: vitest PASS; `npm run build` succeeds (TypeScript compiles — `Engagement.film` is optional so existing consumers still type-check).

- [ ] **Step 6: Commit**

```bash
git add src/api/types.ts src/api/engagements.test.ts src/test/helpers.tsx
git commit -m "feat(types): add engagement kind, ordered films, event_title, visibility"
```

---

## Task 3: Engagement form — Type selector, multi-film, event title, visibility

**Files:**
- Modify: `src/api/types.ts` (`EngagementCreate`)
- Modify: `src/pages/Engagements.tsx`
- Test: `src/pages/Engagements.test.tsx` (create)

**Interfaces:**
- Consumes: `EngagementKind`, `Engagement.films` (Task 2); `FilmSearchCombo` (`onFilmSelected(film)`, `disabled`, `selectedFilmId`).
- Produces: form submits `EngagementCreate { films: number[], kind, event_title?, screen, start_date, end_date, presentation_format?, status?, show_in_main_listings?, notes? }`.

- [ ] **Step 1: Migrate `EngagementCreate` in `src/api/types.ts`**

```ts
export interface EngagementCreate {
  films: number[];
  kind?: EngagementKind;
  event_title?: string;
  screen: number;
  start_date: string;
  end_date: string;
  presentation_format?: '2d' | '3d';
  status?: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'ENDED';
  show_in_main_listings?: boolean;
  notes?: string;
}
```

- [ ] **Step 2: Write the failing form tests**

Create `src/pages/Engagements.test.tsx`. Mock the api modules and render the page; these tests assert the new form behavior. (Reference `src/components/Drawer.test.tsx` for provider/mocking patterns; use `renderWithProviders` from `src/test/helpers.tsx`.)

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, mockScreen, mockFilm } from '../test/helpers';
import Engagements from './Engagements';

vi.mock('../api', () => ({
  engagementsApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  screensApi: { list: vi.fn().mockResolvedValue([mockScreen]) },
  filmsApi: { list: vi.fn().mockResolvedValue([mockFilm]) },
}));

// FilmSearchCombo is heavy (TMDB/debounce); stub it to a button that selects mockFilm.
vi.mock('../components/FilmSearchCombo', () => ({
  default: ({ onFilmSelected }: { onFilmSelected: (f: typeof mockFilm) => void }) => (
    <button type="button" onClick={() => onFilmSelected(mockFilm)}>
      stub-add-film
    </button>
  ),
}));

describe('Engagements form', () => {
  beforeEach(() => vi.clearAllMocks());

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
    // add one film -> still blocked
    fireEvent.click(screen.getByText('stub-add-film'));
    expect(submit).toBeDisabled();
  });
});
```

> The `mockFilm` import requires `mockFilm` to be exported from `helpers.tsx` (it is). These tests assert the contract; you may add more (event-title visibility, submit payload) — keep each assertion real.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/pages/Engagements.test.tsx`
Expected: FAIL — no Type selector / no multi-film behavior yet.

- [ ] **Step 4: Rewrite the form state and handlers in `src/pages/Engagements.tsx`**

Replace the `FormData` interface, `initialFormData`, and the film/submit handlers. Full target for the changed pieces:

```tsx
import type { Engagement, EngagementCreate, EngagementKind, Film, Screen } from '../api/types';

interface FormData {
  kind: EngagementKind;
  films: number[];
  event_title: string;
  screen: number | '';
  start_date: string;
  end_date: string;
  presentation_format: '2d' | '3d';
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'ENDED';
  show_in_main_listings: boolean;
  notes: string;
}

const KIND_OPTIONS: { value: EngagementKind; label: string }[] = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'SPECIAL_EVENT', label: 'Special Event' },
  { value: 'CLASSIC', label: 'Classic' },
  { value: 'DOUBLE_FEATURE', label: 'Double Feature' },
];

const defaultVisibilityForKind = (kind: EngagementKind): boolean => kind === 'REGULAR';

const initialFormData: FormData = {
  kind: 'REGULAR',
  films: [],
  event_title: '',
  screen: '',
  start_date: '',
  end_date: '',
  presentation_format: '2d',
  status: 'DRAFT',
  show_in_main_listings: true,
  notes: '',
};
```

Add film-cache state so the multi-film list can render titles/posters for selected ids. Inside the component, keep a map of known films:

```tsx
  const [filmCache, setFilmCache] = useState<Record<number, Film>>({});

  const handleFilmSelected = (film: Film) => {
    setFilmCache((prev) => ({ ...prev, [film.id]: film }));
    setFormData((prev) => {
      if (prev.kind === 'DOUBLE_FEATURE') {
        if (prev.films.includes(film.id)) return prev; // no duplicates
        return { ...prev, films: [...prev.films, film.id] };
      }
      return { ...prev, films: [film.id] }; // single-film kinds: replace
    });
    queryClient.invalidateQueries({ queryKey: ['films'] });
  };

  const removeFilm = (filmId: number) =>
    setFormData((prev) => ({ ...prev, films: prev.films.filter((id) => id !== filmId) }));

  const handleKindChange = (kind: EngagementKind) =>
    setFormData((prev) => ({
      ...prev,
      kind,
      // trim to one film when leaving double-feature
      films: kind === 'DOUBLE_FEATURE' ? prev.films : prev.films.slice(0, 1),
      show_in_main_listings: defaultVisibilityForKind(kind),
    }));
```

Replace `openEditModal` to prefill from the new shape, caching the engagement's films:

```tsx
  const openEditModal = (engagement: Engagement) => {
    setFilmCache((prev) => ({
      ...prev,
      ...Object.fromEntries(engagement.films.map((f) => [f.id, f])),
    }));
    setFormData({
      kind: engagement.kind,
      films: engagement.films.map((f) => f.id),
      event_title: engagement.event_title,
      screen: engagement.screen,
      start_date: engagement.start_date,
      end_date: engagement.end_date,
      presentation_format: engagement.presentation_format,
      status: engagement.status,
      show_in_main_listings: engagement.show_in_main_listings,
      notes: engagement.notes,
    });
    setSelectedEngagement(engagement);
    setModalMode('edit');
  };
```

Add a validity helper and replace `handleSubmit`:

```tsx
  const requiredFilmCount = (kind: EngagementKind) => (kind === 'DOUBLE_FEATURE' ? 2 : 1);

  const isFormValid = (): boolean => {
    if (formData.screen === '' || !formData.start_date || !formData.end_date) return false;
    if (formData.kind === 'DOUBLE_FEATURE') return formData.films.length >= 2;
    return formData.films.length === 1;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    const data: EngagementCreate = {
      kind: formData.kind,
      films: formData.films,
      event_title: formData.event_title.trim() || undefined,
      screen: formData.screen as number,
      start_date: formData.start_date,
      end_date: formData.end_date,
      presentation_format: formData.presentation_format,
      status: formData.status,
      show_in_main_listings: formData.show_in_main_listings,
      notes: formData.notes,
    };

    if (modalMode === 'create') {
      createMutation.mutate(data);
    } else if (modalMode === 'edit' && selectedEngagement) {
      updateMutation.mutate({ id: selectedEngagement.id, data });
    }
  };
```

Update `handleDelete`'s message to use `engagement.display_title` instead of `engagement.film_title`.

- [ ] **Step 5: Update the form JSX (drawer body)**

Replace the single Film form-group with: a Type selector, then the films control (single combo vs ordered list), then an event-title field (non-Regular), and add a visibility checkbox near status. Concretely, in the `<form id="engagement-form">`:

```tsx
          <div className={styles.formGroup}>
            <label htmlFor="engagement-kind">Type</label>
            <select
              id="engagement-kind"
              value={formData.kind}
              onChange={(e) => handleKindChange(e.target.value as EngagementKind)}
              className={styles.input}
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>

          {formData.kind === 'DOUBLE_FEATURE' ? (
            <div className={styles.formGroup}>
              <label>Films (in play order)</label>
              {formData.films.length > 0 && (
                <ol className={styles.filmList}>
                  {formData.films.map((id, idx) => (
                    <li key={id} className={styles.filmListItem}>
                      <span className={styles.filmListOrder}>{idx + 1}</span>
                      {filmCache[id]?.poster_url && (
                        <img src={filmCache[id]!.poster_url} alt="" className={styles.posterThumb} />
                      )}
                      <span className={styles.filmListTitle}>{filmCache[id]?.title ?? `Film #${id}`}</span>
                      <button type="button" className={styles.removeFilmButton} onClick={() => removeFilm(id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <FilmSearchCombo
                onFilmSelected={handleFilmSelected}
                disabled={createMutation.isPending || updateMutation.isPending}
                selectedFilmId={''}
              />
              {formData.films.length < 2 && (
                <p className={styles.fieldHint}>Add at least two films for a double feature.</p>
              )}
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label htmlFor="film-search">Film</label>
              <FilmSearchCombo
                onFilmSelected={handleFilmSelected}
                disabled={createMutation.isPending || updateMutation.isPending}
                selectedFilmId={formData.films[0] ?? ''}
              />
            </div>
          )}

          {formData.kind !== 'REGULAR' && (
            <div className={styles.formGroup}>
              <label htmlFor="engagement-event-title">Event Title (optional)</label>
              <input
                id="engagement-event-title"
                type="text"
                value={formData.event_title}
                onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
                className={styles.input}
                placeholder="e.g. Creature Double Feature"
              />
            </div>
          )}
```

And, next to the status select, add the visibility checkbox:

```tsx
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.show_in_main_listings}
                onChange={(e) =>
                  setFormData({ ...formData, show_in_main_listings: e.target.checked })
                }
              />
              Show in main listings
            </label>
          </div>
```

Disable the footer submit button when `!isFormValid()` (in addition to the pending checks):

```tsx
              disabled={createMutation.isPending || updateMutation.isPending || !isFormValid()}
```

Add the referenced CSS classes (`filmList`, `filmListItem`, `filmListOrder`, `filmListTitle`, `removeFilmButton`, `fieldHint`, `checkboxLabel`) to `src/pages/Engagements.module.css`, following the existing style conventions in that file (reuse `posterThumb` which already exists).

- [ ] **Step 6: Run the form tests + typecheck**

Run: `npx vitest run src/pages/Engagements.test.tsx && npm run build`
Expected: PASS; build compiles.

- [ ] **Step 7: Commit**

```bash
git add src/api/types.ts src/pages/Engagements.tsx src/pages/Engagements.module.css src/pages/Engagements.test.tsx
git commit -m "feat(engagements): type-driven form with ordered multi-film double features"
```

---

## Task 4: Engagements list display — Type badge, combined title, hidden indicator

**Files:**
- Modify: `src/pages/Engagements.tsx` (table + card rendering)
- Modify: `src/pages/Engagements.module.css`
- Test: `src/pages/Engagements.test.tsx` (add list cases)

**Interfaces:**
- Consumes: `Engagement.kind`, `display_title`, `show_in_main_listings` (Task 2).

- [ ] **Step 1: Write failing list tests**

Add to `src/pages/Engagements.test.tsx` a describe block that mocks `engagementsApi.list` to return a double-feature engagement and asserts the combined title + a Type badge render:

```tsx
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/pages/Engagements.test.tsx`
Expected: FAIL — list renders `film_title`, no type badge.

- [ ] **Step 3: Update list rendering**

In both the desktop table row and the mobile card, replace `engagement.film_title` with `engagement.display_title` in the title cell/heading. Add a Type badge for non-Regular kinds and a hidden indicator. Add this helper near the top of the component:

```tsx
  const KIND_LABELS: Record<EngagementKind, string> = {
    REGULAR: 'Regular',
    SPECIAL_EVENT: 'Event',
    CLASSIC: 'Classic',
    DOUBLE_FEATURE: 'Double Feature',
  };
```

In the table's Film cell (and card title section), after the title span add:

```tsx
                        {engagement.kind !== 'REGULAR' && (
                          <span className={styles.kindBadge}>{KIND_LABELS[engagement.kind]}</span>
                        )}
                        {!engagement.show_in_main_listings && (
                          <span className={styles.hiddenBadge} title="Hidden from public listings">
                            Hidden
                          </span>
                        )}
```

Add `kindBadge` and `hiddenBadge` styles to `Engagements.module.css` (follow the existing `formatBadge` style).

> The list query already fetches via `engagementsApi.list(getFilterParams())` with no kind/visibility params; because Task 1 makes staff see all by default, special screenings now appear without further change. Leave the status/date filter tabs as-is.

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/pages/Engagements.test.tsx && npm run build`
Expected: PASS; build compiles.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Engagements.tsx src/pages/Engagements.module.css src/pages/Engagements.test.tsx
git commit -m "feat(engagements): list shows kind badge, combined title, hidden indicator"
```

---

## Task 5: EngagementDetail — ordered films, kind, event title, visibility

**Files:**
- Modify: `src/api/types.ts` (remove the transitional `film?`)
- Modify: `src/pages/EngagementDetail.tsx`
- Modify: `src/pages/EngagementDetail.module.css` (if new classes needed)
- Test: `src/pages/EngagementDetail.test.tsx` (create)

**Interfaces:**
- Consumes: `Engagement.films`, `display_title`, `kind`, `event_title`, `show_in_main_listings` (Task 2).

- [ ] **Step 1: Write the failing detail test**

Create `src/pages/EngagementDetail.test.tsx`. Mock the api and router param; assert the detail renders the combined title and both films of a double feature.

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, mockFilm, mockScreen } from '../test/helpers';
import EngagementDetail from './EngagementDetail';

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ id: '7' }),
}));

vi.mock('../api', () => ({
  engagementsApi: {
    get: vi.fn().mockResolvedValue({
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
    }),
  },
  showtimesApi: { list: vi.fn().mockResolvedValue([]) },
  filmsApi: { get: vi.fn(), list: vi.fn().mockResolvedValue([mockScreen]) },
}));

describe('EngagementDetail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the combined title and all films of a double feature', async () => {
    renderWithProviders(<EngagementDetail />);
    expect(await screen.findByText('Creature Double Feature')).toBeInTheDocument();
    expect(await screen.findByText('Second Film')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/pages/EngagementDetail.test.tsx`
Expected: FAIL — current page shows `film_title` and fetches a single film via `engagement.film`.

- [ ] **Step 3: Update `EngagementDetail.tsx`**

- Delete the separate film query (the `useQuery(['film', engagement?.film], () => filmsApi.get(engagement!.film), ...)` block at ~lines 70-75) and any variable bound to its result. Use `engagement.films` directly.
- Replace the header `engagement.film_title` (~line 273) and the film-card title (~line 292) with `engagement.display_title` for the page title; render the ordered film list from `engagement.films`:

```tsx
            <div className={styles.filmList}>
              {engagement.films.map((film, idx) => (
                <div key={film.id} className={styles.filmRow}>
                  {engagement.films.length > 1 && <span className={styles.filmOrder}>{idx + 1}</span>}
                  {film.poster_url && <img src={film.poster_url} alt="" className={styles.posterThumb} />}
                  <div>
                    <div className={styles.filmRowTitle}>{film.title}</div>
                    {film.runtime_minutes != null && (
                      <div className={styles.filmRowMeta}>{film.runtime_minutes} min</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
```

- Add a metadata row showing the kind label and, when `!engagement.show_in_main_listings`, a "Hidden from public listings" note, and `event_title` when present. Reuse existing detail styles; add `filmList`/`filmRow`/`filmOrder`/`filmRowTitle`/`filmRowMeta` to `EngagementDetail.module.css` if not present (mirror existing layout classes).
- Keep `engagement.film_poster_url` usages working (they still exist) OR switch the hero poster to `engagement.films[0]?.poster_url`. Prefer `engagement.films[0]?.poster_url` for consistency.

- [ ] **Step 4: Remove the transitional `film?` from the `Engagement` type**

In `src/api/types.ts`, delete the `film?: number;` line from `Engagement` (no consumer references it after this task).

- [ ] **Step 5: Run the detail test + full typecheck**

Run: `npx vitest run src/pages/EngagementDetail.test.tsx && npm run build`
Expected: PASS; build compiles (confirms nothing else referenced `Engagement.film`).

- [ ] **Step 6: Commit**

```bash
git add src/api/types.ts src/pages/EngagementDetail.tsx src/pages/EngagementDetail.module.css src/pages/EngagementDetail.test.tsx
git commit -m "feat(engagements): detail shows ordered films, kind, event title, visibility"
```

---

## Task 6: Full verification (lint, typecheck, tests, build)

**Files:** none (verification only).

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors. Fix any introduced by the new code.

- [ ] **Step 2: Full unit test suite**

Run: `npm run test:run`
Expected: all green. If a pre-existing test referenced the old `film`/`EngagementCreate.film` shape and now fails, update it to the new shape (do not weaken assertions); commit such fixes with `test: update engagement tests for films contract`.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds (tsc + vite).

- [ ] **Step 4: Backend suite still green**

Run: `cd ../api_leprinceos_com && ./runtests api.v1.tests.test_api_engagements && ./runtests api.v1.tests.test_api_showtimes && ./runtests`
Expected: all green.

- [ ] **Step 5: Commit any verification fixes**

```bash
git add -A
git commit -m "test: green lint/build/tests for events & double features frontend"
```

(If Steps 1-4 required no changes, skip the commit.)

---

## Self-Review Notes

- **Spec coverage:** §1 backend auth-aware hide (Task 1); §2 types (Task 2); §3 api filters (Task 2 — `buildQueryString` already generic) + form (Task 3); §4 list & detail display (Tasks 4, 5); §5 api layer (Task 2/3 — no logic change needed); §6 testing (every task + Task 6). All covered.
- **Type consistency:** `EngagementKind`, `films: number[]` (create) vs `films: Film[]` (read), `display_title`, `show_in_main_listings`, `defaultVisibilityForKind`, `KIND_OPTIONS`/`KIND_LABELS` are used consistently across tasks.
- **Green-per-task:** Task 2 keeps `Engagement.film` optional so the build stays green; Task 3 couples the breaking `EngagementCreate` change with its only consumer (the form); Task 5 removes the last `film` reference and the transitional type field. Each task ends on a passing `npm run build`.
- **Judgment left to implementer:** exact badge/CSS styling (follow existing `formatBadge`); whether to extract an `EngagementFilmList` subcomponent if `Engagements.tsx` grows unwieldy (noted in spec §4).
