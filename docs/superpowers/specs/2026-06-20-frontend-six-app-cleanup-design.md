# Frontend cleanup to match the six-app backend

**Date:** 2026-06-20
**Status:** Approved (design)

## Goal

Align the `www_leprinceos_com` React dashboard with the backend that was reduced
to six apps (`cinemas, films, engagements, showtimes, api, www`). The backend
deleted the tickets, memberships, reservations, concessions, and integrations
endpoints, leaving dead frontend surface. Remove it. Also clear the deferred
multitenancy ("de-tenant") leftovers while we're in these files.

This continues the frontend teardown series (POS/concessions, Stripe, reports
UI already removed — see recent commits and prior specs in this directory).

## Scope

Two well-bounded areas, one spec:
- **A. Tickets + memberships** dead-surface removal (no backend endpoints remain).
- **B. De-tenant** cleanup (multitenancy leftovers from the earlier `Cinema`→
  `SiteConfig` work). Behavior-preserving — see below.

Out of scope: per-site timezone from `SiteConfig` (stays on the backlog);
Cypress/lint pre-existing errors documented as not-ours.

## Findings that shape the design

- No surviving non-test file imports `ticketsApi` or any membership api/type;
  the only consumer of the deleted code is its own tests.
- `currentCinema` is consumed in exactly three places — `Home`,
  `EngagementDetail`, `Showtimes` — each as
  `currentCinema?.cinema_timezone || 'America/New_York'`. `currentCinema` is
  **always null** in single-tenant today, so these already resolve to
  `'America/New_York'`. Replacing them with a constant changes nothing.
- `isManager = currentCinema?.is_manager || user?.is_superuser` already reduces
  to `user?.is_superuser`. Simplifying it is behavior-preserving.
- `BillingIcon`, `MembershipsIcon`, `ChevronIcon` are defined and used **only**
  in `Sidebar.tsx`.
- `webusb.d.ts` is referenced **only** by `hooks/usePrinter.ts` and its test;
  `usePrinter` is imported by nothing else.
- `ProtectedRoute` uses only `isAuthenticated`/`isLoading` — unaffected.

## A. Remove tickets + memberships

**Delete pages** (each `.tsx` + `.module.css`): `Tickets`, `TicketDetail`,
`Members`, `MemberDetail`, `Memberships`, `MembershipDetail`, `MembershipTiers`,
`TierDetail`.

**Delete api clients:** `api/tickets.ts`, `api/tickets.test.ts`,
`api/memberships.ts`. In `api/index.ts`, remove the `ticketsApi` export and the
membership export block (`membersApi, membershipTiersApi, membershipsApi,
benefitRulesApi, benefitConditionsApi`).

**Prune `api/types.ts`:** remove `TicketTypeRule`, `TicketTypeRuleCreate`,
`TicketType`, `TicketTypeDetail`, `TicketTypeCreate`, `AvailableTicketType`, and
the membership block (`MembershipStatus`, `BenefitType`, `BenefitScope`, the
benefit condition types, `Member`, `MemberCreate`, `MemberLookup`,
`MembershipTier`, `MembershipTierCreate`, and the rest of the membership/benefit
types). Keep types used by surviving features.

**`api/showtimes.ts`:** remove the `availableTicketTypes()` method and the
`AvailableTicketType` import (its endpoint `/v1/showtimes/{id}/
available-ticket-types/` was deleted backend-side → guaranteed 404). Update
`showtimes.test.ts` if it covers that method.

**`App.tsx`:** remove the 8 page imports and 8 `<Route>` entries (tickets,
tickets/:id, members, members/:id, membership-tiers, membership-tiers/:id,
memberships, memberships/:id).

**`Sidebar.tsx`:** remove the Memberships nav group (Members/Tiers/Memberships),
the Tickets nav item, and the now-unused `MembershipsIcon` and `BillingIcon`.

**Delete `hooks/usePrinter.ts`, `hooks/usePrinter.test.ts`, and `webusb.d.ts`**
(orphaned thermal-printer feature; the ticket-printing flow was its only user).

## B. De-tenant (behavior-preserving)

**`contexts/AuthContext.tsx`:** remove `currentCinema` state, `selectCinema`, the
`CinemaMembership` import, and all `selected_cinema_id`/`cinemas` handling.
Change `isManager` to `!!user?.is_superuser`. The context value becomes
`{ user, isLoading, isAuthenticated, isManager, login, logout }`.

**`api/auth.ts`:** remove the `CinemaMembership` interface and the `cinemas?`
field on `User`. Remove the `selected_cinema_id` localStorage cleanup if present.

**`api/client.ts`:** remove `getCurrentCinemaId` and the `selected_cinema_id`
removal line.

**`components/Layout.tsx`:** remove the `cinemas` transform,
`currentCinemaForSidebar`, `handleCinemaChange`, and the `currentCinema`/
`cinemas`/`onCinemaChange` props passed to `Sidebar`. Stop destructuring
`currentCinema`/`selectCinema` from `useAuth`.

**`components/Sidebar.tsx`:** remove the `Cinema` interface, the `currentCinema`/
`cinemas`/`onCinemaChange` props, the cinema-selector dropdown block (+ its
`styles.sidebarCinemaSelector*` / `cinemaSelector*` CSS) and `ChevronIcon`
**iff** no other Sidebar code uses it (verify during implementation; the
group-expand toggle may reuse it — if so, keep `ChevronIcon`).

**`Home.tsx` / `EngagementDetail.tsx` / `Showtimes.tsx`:** add
`export const DEFAULT_TIMEZONE = 'America/New_York'` to `utils/timezone.ts` and
replace each `currentCinema?.cinema_timezone || 'America/New_York'` with
`DEFAULT_TIMEZONE`. Drop the now-unused `currentCinema`/`useAuth` import where it
becomes unused (Home still uses `user`; EngagementDetail/Showtimes drop the
`useAuth` call if `currentCinema` was their only use).

## Testing

- **Update** `contexts/AuthContext.test.tsx`: remove the `currentCinema`/
  `selectCinema`/`selected_cinema_id`/`getCurrentCinemaId` cases; keep the
  login/logout/isAuthenticated/isManager coverage (isManager now keys off
  `is_superuser`).
- **Update** `test/helpers.tsx`: drop the mock `cinemas: [...]` and any
  `currentCinema`/`selectCinema` from the mocked auth shape so it matches the
  trimmed `User`/context.
- **Delete** `api/tickets.test.ts` and `hooks/usePrinter.test.ts` with their
  subjects.
- Leave `ConfirmContext.test.tsx` (its "Cancel Membership" strings are generic
  sample dialog text, not coupling).
- **Gate:** `npm run build` clean and `vitest` green. Pre-existing lint error
  (`AuthContext.test.tsx` `_omit`) and the 3 Cypress-tsc errors are documented
  in the backlog as not-ours; do not let them block, but do not add new ones.

## Verification checklist

- `grep` shows no remaining references to tickets/memberships api or types, to
  `currentCinema`/`selectCinema`/`selected_cinema_id`/`CinemaMembership`, or to
  `usePrinter`/`webusb` in surviving code.
- Surviving nav: Home, Engagements, Screens, API Docs (external). No Tickets,
  no Memberships group.
- `npm run build` + `vitest` green.
