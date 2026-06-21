# Frontend Six-App Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the dead tickets/memberships frontend surface and the multitenancy (de-tenant) leftovers so the React dashboard matches the six-app backend.

**Architecture:** Pure removal/refactor in a Vite + React + TypeScript app. Each task deletes a cohesive vertical and leaves a green typecheck + test run. Order: orphaned printer hook → tickets/memberships surface → de-tenant.

**Tech Stack:** React 18, TypeScript, Vite, React Router, TanStack Query, Vitest + React Testing Library.

## Global Constraints

- **Build gate (every task):** `npm run build` (`tsc -b && vite build`) must pass — this is the real safety net; `tsc` fails on any dangling import or removed type still referenced.
- **Test gate (every task):** `npm run test:run` (`vitest run`) green.
- **Branch:** `frontend-six-app-cleanup` (already checked out; never switch branches).
- **Keep `ChevronIcon`** in `Sidebar.tsx` — it is used by the nav group-expand toggle (line ~239), not only the cinema selector.
- **`DEFAULT_TIMEZONE` value is exactly `'America/New_York'`.**
- **Pre-existing, NOT ours** (do not fix, do not add new ones): a lint `_omit` warning in `AuthContext.test.tsx`, and 3 Cypress-tsc errors. Do not run Cypress as a gate.
- Stage only files each task touches; never `git add -A` blindly; never stage anything under `docs/superpowers/` scratch or unrelated `package-lock.json` drift.

---

### Task 1: Delete the orphaned thermal-printer hook

**Files:**
- Delete: `src/hooks/usePrinter.ts`
- Delete: `src/hooks/usePrinter.test.ts`
- Delete: `src/webusb.d.ts`

**Interfaces:**
- Consumes: nothing. Produces: nothing. `usePrinter` is imported by no surviving code; `webusb.d.ts` ambient types are referenced only by `usePrinter`.

- [ ] **Step 1: Confirm the hook is truly orphaned**

```bash
grep -rn "usePrinter\|navigator.usb\|USBDevice\|webusb" src --include="*.ts" --include="*.tsx" | grep -vE "hooks/usePrinter|webusb.d.ts"
```
Expected: no output. If anything appears, STOP and report — the hook is not orphaned.

- [ ] **Step 2: Delete the three files**

```bash
git rm src/hooks/usePrinter.ts src/hooks/usePrinter.test.ts src/webusb.d.ts
```

- [ ] **Step 3: Typecheck + build**

```bash
npm run build
```
Expected: succeeds (no TS errors, Vite build completes).

- [ ] **Step 4: Tests**

```bash
npm run test:run
```
Expected: green (the usePrinter test suite is gone; nothing else referenced it).

- [ ] **Step 5: Commit**

```bash
git add -A -- src/hooks src/webusb.d.ts
git commit -m "chore(printer): remove orphaned usePrinter hook and webusb types"
```

---

### Task 2: Remove the tickets + memberships surface

**Files:**
- Delete pages (each `.tsx` + matching `.module.css`): `src/pages/Tickets`, `TicketDetail`, `Members`, `MemberDetail`, `Memberships`, `MembershipDetail`, `MembershipTiers`, `TierDetail`
- Delete api: `src/api/tickets.ts`, `src/api/tickets.test.ts`, `src/api/memberships.ts`
- Modify: `src/api/index.ts`, `src/api/types.ts`, `src/api/showtimes.ts` (and `src/api/showtimes.test.ts` if it covers the removed method), `src/App.tsx`, `src/components/Sidebar.tsx`, `src/test/helpers.tsx`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: a smaller `api/index.ts` barrel (no `ticketsApi`, no membership exports) and `api/types.ts` (no ticket/membership types). Later tasks don't depend on these.

- [ ] **Step 1: Delete the eight pages and their CSS**

```bash
git rm src/pages/Tickets.tsx src/pages/Tickets.module.css \
       src/pages/TicketDetail.tsx src/pages/TicketDetail.module.css \
       src/pages/Members.tsx src/pages/Members.module.css \
       src/pages/MemberDetail.tsx src/pages/MemberDetail.module.css \
       src/pages/Memberships.tsx src/pages/Memberships.module.css \
       src/pages/MembershipDetail.tsx src/pages/MembershipDetail.module.css \
       src/pages/MembershipTiers.tsx src/pages/MembershipTiers.module.css \
       src/pages/TierDetail.tsx src/pages/TierDetail.module.css
```

- [ ] **Step 2: Delete the ticket + membership api clients**

```bash
git rm src/api/tickets.ts src/api/tickets.test.ts src/api/memberships.ts
```

- [ ] **Step 3: Trim the api barrel `src/api/index.ts`**

Remove the `ticketsApi` export line and the entire membership export block. The barrel should end up as:

```ts
// src/api/index.ts
export { default as apiClient } from './client';
export * from './client';

export { default as authApi } from './auth';
export * from './auth';

export { default as engagementsApi } from './engagements';
export { default as showtimesApi } from './showtimes';
export { default as filmsApi } from './films';
export { default as screensApi } from './screens';

export * from './types';
```

- [ ] **Step 4: Prune `src/api/types.ts`**

Delete the "Ticket Types" section and the "Memberships" section in full: the interfaces/types `TicketTypeRule`, `TicketTypeRuleCreate`, `TicketType`, `TicketTypeDetail`, `TicketTypeCreate`, `AvailableTicketType`, `MembershipStatus`, `BenefitType`, `BenefitScope`, the benefit-condition type union, `Member`, `MemberCreate`, `MemberLookup`, `MembershipTier`, `MembershipTierCreate`, and every other membership/benefit type in that block. Leave types used by surviving features (engagements, showtimes, films, screens, auth) untouched.

- [ ] **Step 5: Remove the dead `availableTicketTypes` method from `src/api/showtimes.ts`**

Delete the `AvailableTicketType` import and the `availableTicketTypes` method (its endpoint `/v1/showtimes/${showtimeId}/available-ticket-types/` was deleted backend-side). If `src/api/showtimes.test.ts` has a test for `availableTicketTypes`, delete that test case.

- [ ] **Step 6: Remove the 8 routes and imports from `src/App.tsx`**

Delete these import lines (9–16): `Tickets`, `TicketDetail`, `Members`, `MemberDetail`, `MembershipTiers`, `TierDetail`, `Memberships`, `MembershipDetail`. Delete the 8 `<Route>` lines (92–99) for `tickets`, `tickets/:id`, `members`, `members/:id`, `membership-tiers`, `membership-tiers/:id`, `memberships`, `memberships/:id`. Keep `Home`, `Engagements`, `EngagementDetail`, `Screens`, and the `*` NotFound route.

- [ ] **Step 7: Remove tickets/memberships nav from `src/components/Sidebar.tsx`**

In the `navItems` array (around lines 153–166), remove the `Memberships` nav group object (`label: 'Memberships'` with Members/Tiers/Memberships items) and the `{ path: '/tickets', label: 'Tickets', icon: <BillingIcon /> }` item. Then delete the now-unused icon components `BillingIcon` (lines ~70–75) and `MembershipsIcon` (lines ~84–95). **Do NOT delete `ChevronIcon`** (used by the group toggle). Leave `HomeIcon`, `EngagementsIcon`, `ScreensIcon`, `ApiDocsIcon`, `LogoutIcon`.

- [ ] **Step 8: Remove `mockTicketType` from `src/test/helpers.tsx`**

Delete the `mockTicketType` export (lines ~140–150). Leave the other mocks. (The `cinemas` field on `mockUser` is handled in Task 3.)

- [ ] **Step 9: Typecheck + build (catches any missed reference)**

```bash
npm run build
```
Expected: succeeds. If `tsc` reports an unresolved import or missing type, fix that reference (it points at a straggler consumer) and re-run.

- [ ] **Step 10: Tests + reference sweep**

```bash
npm run test:run
grep -rn "ticketsApi\|membersApi\|membershipsApi\|membershipTiersApi\|benefitRulesApi\|benefitConditionsApi\|AvailableTicketType\|TicketType\|MembershipTier\|mockTicketType" src --include="*.ts" --include="*.tsx"
```
Expected: tests green; grep returns no output.

- [ ] **Step 11: Commit**

```bash
git add -A -- src/pages src/api src/App.tsx src/components/Sidebar.tsx src/test/helpers.tsx
git commit -m "refactor: remove tickets and memberships frontend surface"
```

---

### Task 3: De-tenant cleanup (behavior-preserving)

**Files:**
- Modify: `src/contexts/AuthContext.tsx`, `src/api/auth.ts`, `src/api/client.ts`, `src/components/Layout.tsx`, `src/components/Sidebar.tsx`, `src/utils/timezone.ts`, `src/pages/Home.tsx`, `src/pages/EngagementDetail.tsx`, `src/pages/Showtimes.tsx`, `src/test/helpers.tsx`
- Rewrite: `src/contexts/AuthContext.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `useAuth()` returns `{ user, isLoading, isAuthenticated, isManager, login, logout }` — NO `currentCinema`, NO `selectCinema`. `User` has no `cinemas` field. `utils/timezone.ts` exports `DEFAULT_TIMEZONE: string`.

- [ ] **Step 1: Add `DEFAULT_TIMEZONE` to `src/utils/timezone.ts`**

Add near the top of the file (after the header comment, before `formatInTimezone`):

```ts
/** Single-tenant default display timezone (per-site SiteConfig timezone is backlog work). */
export const DEFAULT_TIMEZONE = 'America/New_York';
```

- [ ] **Step 2: Replace `src/api/auth.ts` with the de-tenanted version**

```ts
// src/api/auth.ts
import apiClient, { setCsrfToken, clearCsrfToken } from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  csrfToken: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    const response = await apiClient.post<LoginResponse>('/v1/auth/login/', credentials);
    setCsrfToken(response.data.csrfToken);
    return response.data.user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/v1/auth/logout/');
    } finally {
      clearCsrfToken();
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/v1/auth/me/');
    return response.data;
  },
};

export default authApi;
```

- [ ] **Step 3: Replace `src/contexts/AuthContext.tsx` with the de-tenanted version**

```tsx
/* eslint-disable react-refresh/only-export-components */
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, type User } from '../api';
import { clearCsrfToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isManager: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount by trying to get current user
  useEffect(() => {
    const checkSession = async () => {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      } catch {
        // No valid session - user not authenticated
        setUser(null);
        clearCsrfToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const userData = await authApi.login({ username, password });
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const isManager = !!user?.is_superuser;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isManager,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
```

- [ ] **Step 4: Remove cinema bits from `src/api/client.ts`**

Delete the `getCurrentCinemaId` export (the `// Get current cinema ID from localStorage` comment + the function). In the response interceptor's 401 handler, delete the line `localStorage.removeItem('selected_cinema_id');` (keep `clearCsrfToken();` and the redirect).

- [ ] **Step 5: Remove the cinema-switcher wiring from `src/components/Layout.tsx`**

Change the `useAuth()` destructure (line 16) to:

```tsx
  const { user, isManager } = useAuth();
```

Delete the cinema transform block (lines ~44–60): `const cinemas = ...`, `const currentCinemaForSidebar = ...`, and `const handleCinemaChange = ...`. In the `<Sidebar ... />` JSX, remove the `currentCinema={currentCinemaForSidebar}`, `cinemas={cinemas}`, and `onCinemaChange={handleCinemaChange}` props. Keep `username`, `isManager`, `onLogout`, `isOpen`, `onClose`.

- [ ] **Step 6: Remove the cinema selector from `src/components/Sidebar.tsx`**

- Delete the `Cinema` interface (lines ~6–9).
- In `SidebarProps`, remove `currentCinema?: Cinema | null;`, `cinemas?: Cinema[];`, and `onCinemaChange?: (cinemaId: number) => void;`.
- In the `Sidebar({ ... })` destructure, remove `currentCinema`, `cinemas = []`, and `onCinemaChange`.
- Remove the `const [isCinemaDropdownOpen, setIsCinemaDropdownOpen] = useState(false);` line.
- Delete the entire `{/* Cinema Selector */}` JSX block (lines ~194–224, the `{currentCinema && cinemas.length > 1 && ( ... )}` expression).
- **Keep `ChevronIcon`** and the nav group-toggle that uses it.

- [ ] **Step 7: Switch the three pages to `DEFAULT_TIMEZONE`**

In each of `src/pages/Home.tsx`, `src/pages/EngagementDetail.tsx`, `src/pages/Showtimes.tsx`:
- Import `DEFAULT_TIMEZONE`: add it to the existing `from '../utils/timezone'` import (these pages already import timezone helpers from there).
- Replace `const cinemaTimezone = currentCinema?.cinema_timezone || 'America/New_York';` with `const cinemaTimezone = DEFAULT_TIMEZONE;`.
- `Home.tsx`: keep `const { user } = useAuth();` (drop only `currentCinema`).
- `EngagementDetail.tsx` and `Showtimes.tsx`: `currentCinema` was the only `useAuth()` use — delete the `const { currentCinema } = useAuth();` line and remove the now-unused `useAuth` import.

- [ ] **Step 8: Drop the `cinemas` field from `mockUser` in `src/test/helpers.tsx`**

Edit the `mockUser` export to remove the `cinemas: [ ... ]` array, leaving:

```ts
// Mock user data for testing
export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  is_superuser: false,
};
```

- [ ] **Step 9: Rewrite `src/contexts/AuthContext.test.tsx` for the new context**

Make the test match the de-tenanted context. Concretely:
- Remove `getCurrentCinemaId: vi.fn(),` from the `../api/client` mock.
- Delete the entire `describe('Cinema Selection', ...)` block (all `selected_cinema_id`, `selectCinema`, and `currentCinema?.cinema_id` cases).
- Delete the `it('should handle login with no cinemas', ...)` case and any case whose sole purpose was cinema behavior.
- In every surviving test, remove assertions on `currentCinema` and `selectCinema` (e.g. `expect(result.current.currentCinema)...`, `expect(typeof result.current.selectCinema)...`). Any test reading `mockUser.cinemas[...]` must be removed or rewritten without it (`mockUser` no longer has `cinemas`).
- Update the `describe('Context Value', ...)` expectation so the asserted context object is exactly: `user`, `isLoading`, `isAuthenticated`, `isManager`, `login`, `logout` (with `login`/`logout` as functions). For `mockUser` (`is_superuser: false`), `isManager` must be `false`.
- Keep the useAuth-outside-provider, loading-state, load-on-mount, login-success, login-error, and logout coverage.

The gate is `npm run test:run` green — iterate the test edits until the whole file passes against the new `AuthContext`.

- [ ] **Step 10: Typecheck + build**

```bash
npm run build
```
Expected: succeeds. `tsc` will flag any leftover `currentCinema`/`selectCinema`/`CinemaMembership`/`cinemas`/`getCurrentCinemaId` reference — fix each it reports.

- [ ] **Step 11: Tests + reference sweep**

```bash
npm run test:run
grep -rn "currentCinema\|selectCinema\|selected_cinema_id\|CinemaMembership\|getCurrentCinemaId\|cinema_timezone" src --include="*.ts" --include="*.tsx"
```
Expected: tests green; grep returns no output.

- [ ] **Step 12: Commit**

```bash
git add -A -- src/contexts src/api/auth.ts src/api/client.ts src/components/Layout.tsx src/components/Sidebar.tsx src/utils/timezone.ts src/pages/Home.tsx src/pages/EngagementDetail.tsx src/pages/Showtimes.tsx src/test/helpers.tsx
git commit -m "refactor(auth): remove multitenancy (de-tenant) leftovers"
```

---

## Self-Review Notes

- **Spec coverage:** Task 2 covers spec section A (pages, api clients, types, showtimes method, App routes, Sidebar nav, usePrinter is Task 1). Task 3 covers section B (AuthContext, auth.ts, client.ts, Layout, Sidebar selector, 3 pages timezone, tests/helpers). All spec items mapped.
- **ChevronIcon:** spec's conditional resolved — it IS reused by the group toggle, so it is kept (Global Constraints + Task 2 Step 7 + Task 3 Step 6).
- **Green at each commit:** Task 1 is independent; Task 2 removes a self-contained vertical (only its own tests/routes/nav consumed it); Task 3's behavior-preserving edits are covered by the rewritten AuthContext test. `npm run build` (tsc) is the backstop that catches any missed reference in every task.
- **Out of scope:** per-site `SiteConfig` timezone (backlog); pre-existing lint `_omit` + Cypress-tsc errors (not gated).
