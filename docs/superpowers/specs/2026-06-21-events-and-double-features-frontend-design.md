# Events, Special Screenings & Double Features — Frontend Design

**Date:** 2026-06-21
**Status:** Approved (pending spec review)
**Repos:** `www_leprinceos_com` (primary) + a small change in `api_leprinceos_com`

## Goal

Update the staff dashboard so staff can create and manage special screenings
(events, classic-movie nights) and **double features** (one admission, one start
time, multiple ordered films), using the new backend contract. This includes a
**mandatory contract fix**: the engagement create/edit form currently sends
`film: number`, which the new API rejects — it now requires `films: number[]`.

## Context — current state

The dashboard (`basename="/dashboard"`, all routes behind `ProtectedRoute`) is
staff-only; there is no customer-facing page in this app. The engagement
create/edit lives in `src/pages/Engagements.tsx` and uses
`src/components/FilmSearchCombo` to pick a single film. It posts
`EngagementCreate { film, screen, start_date, end_date, presentation_format,
status, notes }`.

The merged backend (api_leprinceos_com) changed the contract:
- Write: engagements take `films: number[]` (ordered), plus `kind`,
  `event_title`, `show_in_main_listings`. The old writable `film` field is gone.
- Read: engagements now return `kind`, `event_title`, `display_title`,
  `films: Film[]` (ordered), `show_in_main_listings`, and still return
  `film_title` / `film_poster_url` (backwards-compat, from the lead film).
- The `/v1/engagements/` and `/v1/showtimes/` list endpoints default-hide
  non-main-listing items. These endpoints are readable without auth
  (`IsStaffOrReadOnly`), which is why the hide exists.

So the current form is already broken against the merged API, and the staff list
would now hide events from the people who manage them.

## Decisions (from brainstorming)

- **One unified form**, driven by a **Type** selector. Choosing Double Feature
  reveals an ordered multi-film list; other kinds keep the single-film picker.
- **Staff see everything.** The hide-by-default is a customer-feed concern; the
  staff management list shows all kinds. Achieved via a small auth-aware backend
  change (below), not a frontend param hack.
- **Film order = the order films are added.** No drag/up-down reorder UI in v1;
  remove + re-add to change order.

## §1 — Backend change (`api_leprinceos_com`)

Make the list default-hide apply **only to non-staff (anonymous) reads**.
Authenticated staff get all engagements/showtimes by default; the explicit
`?show_in_main_listings=` / `?kind=` filters still work for everyone. The public
customer feed (`showtimes/selectors.get_now_playing` / `get_coming_soon` /
`engagements/selectors.get_now_playing_engagements_with_showtimes`) already
hard-filters to visible items, so this is safe.

- `api/v1/views/engagements.py` `EngagementViewSet.get_queryset`: the existing
  `list`-action default-hide gains a guard so it only applies when the request
  is NOT an authenticated staff user. Mirror the staff determination used by
  `cinemas.permissions.IsStaffOrReadOnly` (the plan pins the exact check).
- `api/v1/views/showtimes.py` `ShowtimeViewSet.get_queryset`: same guard, on
  `engagement__show_in_main_listings`.
- **Test updates:** the existing Task-8 `EngagementListingVisibilityTests` and
  `ShowtimeListingVisibilityTests` assert that the *authenticated staff* default
  list hides non-main-listing items. Flip them: default-hide is now asserted for
  an **anonymous** client; add an assertion that a **staff** default list
  returns all (visible + hidden). The explicit `?show_in_main_listings=false`
  opt-in assertions stay.

## §2 — Types (`src/api/types.ts`)

```ts
export type EngagementKind = 'REGULAR' | 'SPECIAL_EVENT' | 'CLASSIC' | 'DOUBLE_FEATURE';

export interface Engagement {
  id: number;
  kind: EngagementKind;
  event_title: string;
  display_title: string;
  films: Film[];            // ordered
  film_title: string;       // backcompat (lead film) — kept
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

export interface EngagementCreate {
  films: number[];          // replaces `film`
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

export interface EngagementFilters {
  status?: string;
  films?: number;           // renamed from `film` (M2M filter)
  screen?: number;
  kind?: string;
  show_in_main_listings?: boolean;
  start_date_after?: string;
  start_date_before?: string;
  end_date_after?: string;
  end_date_before?: string;
}
```

`Showtime` already exposes `film_title` / `film_poster_url` /
`film_runtime_minutes` (now display-title / summed-runtime on the backend) — no
type change required there; values just become combined for double features.

## §3 — API layer (`src/api/engagements.ts`)

- `create`/`update` pass the new `EngagementCreate` shape (no code change beyond
  types — the body is forwarded as-is).
- `buildQueryString` already serializes any `EngagementFilters` key generically,
  so `kind` / `show_in_main_listings` / `films` work without changes.
- Grep for any consumer of the removed `EngagementFilters.film` and update to
  `films` (the dashboard list uses status/date filters, so impact is expected to
  be nil — confirm during implementation).

## §4 — Engagement form (`src/pages/Engagements.tsx`)

Form state changes from `film: number | ''` to `films: number[]`, plus `kind`,
`event_title`, `show_in_main_listings`.

- **Type selector** (`<select>`) at the top of the drawer: Regular / Special
  Event / Classic / Double Feature. Changing it:
  - Sets a sensible default for `show_in_main_listings` (Regular → true, others →
    false) unless the user already toggled it.
  - For non-Double-Feature kinds, trims `films` to at most one entry.
- **Films:**
  - Non-double-feature: the existing `FilmSearchCombo` selects exactly one film;
    selecting sets `films = [id]` (replace). `selectedFilmId = films[0]`.
  - Double feature: an **ordered film list** — each selected film renders as a
    row (lead-film poster thumb + title + a Remove button), in add order. Below
    the list, a `FilmSearchCombo` appends the next film (`films = [...films,
    id]`), skipping a film already present. Order in the list = order sent.
- **Event title:** optional `<input>` shown for non-Regular kinds; placeholder
  "e.g. Creature Double Feature". Blank ⇒ omit (backend falls back to film
  titles).
- **Visibility:** a "Show in main listings" checkbox bound to
  `show_in_main_listings`, defaulted from kind, overridable.
- **Validation (client-side, before submit):** Regular/Classic/Special Event
  require exactly 1 film; Double Feature requires ≥2. Submit button disabled with
  an inline hint until satisfied (also screen + dates required as today).
- **Submit payload:** `EngagementCreate` with `films`, `kind`, `event_title`
  (omitted if blank), `show_in_main_listings`, and the existing fields. Edit
  prefills `films` from `engagement.films.map(f => f.id)`, `kind`, `event_title`,
  `show_in_main_listings`.

The new film-list rendering is small enough to live inline in `Engagements.tsx`
initially; if the form grows unwieldy, extract an `EngagementFilmList`
subcomponent (decision deferred to the plan).

## §5 — List & detail display

- **Engagements list** (`Engagements.tsx`): request all engagements (no
  visibility filter — staff see everything now). Add a **Type badge** in the row
  (a small label for non-Regular kinds; Regular shows none or a neutral one) and
  a subtle "Hidden from public" indicator when `show_in_main_listings` is false.
  Use `display_title` for the title cell (double features read "Alien + Aliens"
  or the event title); poster uses `film_poster_url` (lead film). The existing
  status/date filter tabs are unchanged.
- **EngagementDetail** (`src/pages/EngagementDetail.tsx`): show kind, event title
  (if any), the **full ordered film list** (not just one film), visibility, and
  the existing fields. Edit reuses the §4 form.

## §6 — Testing

Vitest + React Testing Library (matching existing `*.test.tsx` / `*.test.ts`):

- **Form:** Type selector renders; switching to Double Feature reveals the
  multi-film list; adding one film keeps submit disabled, adding a second enables
  it; switching back to Regular trims to one film; event-title + visibility
  appear/behave per kind; submit calls the API with `films: number[]` (+ kind,
  visibility).
- **List:** renders Type badges and `display_title`; the hidden indicator shows
  when `show_in_main_listings` is false.
- **API/types:** update `src/api/engagements.test.ts` and any test asserting the
  old `EngagementCreate.film` / `Engagement.film` shape.
- **Backend (api repo):** the §1 viewset tests (anonymous hides; staff sees all).

E2E (Cypress) is out of scope for v1 unless an existing engagement E2E flow
breaks on the contract change — if so, update it minimally.

## Out of scope

- Film reorder UI (order = add order).
- Intermission/gap handling for double features (backend sums runtime).
- Any customer-facing page (none exists in this app).

## Open questions / assumptions

1. Exact staff check in §1 mirrors `IsStaffOrReadOnly`; pinned in the plan.
2. Type badge visual treatment (color per kind) is a presentation detail left to
   implementation, following existing badge styles in `Engagements.module.css`.
