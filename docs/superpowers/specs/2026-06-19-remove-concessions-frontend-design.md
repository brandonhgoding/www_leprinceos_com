# Remove POS / Concessions / Online-Ordering / Embeds (Dashboard Frontend) — Design

**Date:** 2026-06-19
**Status:** Approved
**Repo:** `www_leprinceos_com` (React 19 + TypeScript + Vite dashboard, served at `/dashboard`)

## Goal

The backend (`api_leprinceos_com`, merge `d4bbe26`) removed concessions, the POS,
the online-ordering flow, and the embed checkout. Remove the corresponding dashboard
UI so nothing calls dead endpoints. Keep tickets, memberships, reports, screens,
engagements, and the Integrations (Stripe Connect) page.

## Out of scope

- The separate cinema/multi-tenancy frontend de-tenant (tracked in the backend
  cleanup backlog). Do **not** touch `AuthContext`, the cinema selector in
  `Sidebar.tsx`, or `localStorage` cinema state.
- The backend display embeds (now-playing/showtimes/etc.) remain live as
  server-rendered Django templates; removing the dashboard *Embeds page* (a
  copy-paste code UI) does not affect them or the marketing-site iframes.

## Remove entirely

- **Pages** (each with its `.module.css`): `POS`, `Concessions`,
  `ConcessionItemDetail`, `Modifiers`, `Taxes`, `OnlineOrders`, `Embeds`.
- **API clients:** `src/api/concessions.ts`, `src/api/onlineOrders.ts`,
  `src/api/taxes.ts`.
- **Utils:** `src/utils/escpos.ts` and `src/utils/escpos.test.ts` (POS receipt
  printing; only `POS.tsx` imports it).
- **Widget:** all of `src/widget/` (calls the removed `/public/concessions/`,
  `/public/showtimes/`, `/public/orders/` endpoints), `vite.config.widget.ts`, the
  `build:widget` script, and the widget build step in `build:all` (collapse back to
  `tsc -b && vite build`).
- **Routing & nav:** the `<Route>`s in `src/App.tsx` and the nav entries +
  now-unused icon components in `src/components/Sidebar.tsx` for POS, Online Orders,
  the Concessions group (Items & Categories, Modifiers), Taxes, and Embeds.
- **Cypress:** delete `cypress/e2e/concession-items.cy.ts`,
  `cypress/e2e/concession-item-detail.cy.ts`, `cypress/e2e/modifiers.cy.ts`; edit
  `cypress/e2e/navigation.cy.ts` to drop assertions about the removed nav entries.

## Modify (concession references in retained code)

- `src/api/types.ts`: drop `CONCESSION` from `BenefitScope`; drop the three
  `CONCESSION_*` members of the benefit `ConditionType`; remove the concession, POS,
  and online-order interfaces (`ConcessionItem*`, `ConcessionCategory*`,
  `ConcessionVariation*`, `POSConcessionItem`, POS sale request/response, online-order
  types).
- `src/pages/TierDetail.tsx`: remove the `CONCESSION` benefit-condition option block
  and the three `CONCESSION_*` condition branches + the `concessionsApi` import and its
  category/item/variation lookups. Benefit rules become ticket-only (mirrors backend).
- `src/api/payments.ts`: remove the dead POS-only calls — `createSale` →
  `/v1/pos/sales/` (endpoint deleted), and `create-intent` / `terminal-connection-token`
  if `POS.tsx` was their only caller. Keep the Stripe Connect functions
  (`connect/onboard`, `connect/status`, `refund`) that `Integrations.tsx` uses.
- `src/pages/Integrations.tsx`: drop "POS" wording from the Stripe/reader copy; keep
  the page and its Stripe Connect wiring.
- `src/api/index.ts`: drop the exports for the removed API client modules.

## Verification

- `npm run build` (`tsc -b && vite build`) — the **primary gate**: TypeScript fails on
  any dangling import, removed type, or stale reference.
- `npm run test:run` (vitest) — unit tests green.
- `npm run lint` (eslint) — no new errors (e.g. unused imports).
- Cypress specs compile under `tsconfig.cypress.json` (the edited `navigation.cy.ts`
  and remaining specs typecheck).

## Process

Spec → implementation plan → fresh subagent per task with task reviews, then a final
whole-branch review, on an isolated branch off `main`.
