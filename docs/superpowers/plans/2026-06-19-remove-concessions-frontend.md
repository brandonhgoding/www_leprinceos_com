# Remove POS/Concessions/Online-Ordering/Embeds UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the dashboard UI for the backend-removed features (POS, concessions, online-ordering, embed checkout) so nothing calls dead endpoints, keeping tickets/memberships/reports/screens/engagements/Integrations intact.

**Architecture:** Outside-in removal by feature. TypeScript (`tsc -b` via `npm run build`) is the cross-cutting safety net — it fails on any dangling import, removed type, or unused local, so each task is ordered to leave the build green. The benefit-UI decoupling (Task 1) runs first so `concessions.ts` can be deleted later without breaking `TierDetail`.

**Tech Stack:** React 19, TypeScript, Vite, React Query, React Router, Vitest, Cypress, ESLint.

## Global Constraints

- Verify every task with: `npm run build` (PRIMARY gate — `tsc -b && vite build`), `npm run test:run` (vitest), `npm run lint` (eslint, no new errors). Run from repo root `/Users/bgoding/code/SoftwareMaine/www_leprinceos_com`.
- Do NOT touch cinema/multi-tenancy code (`AuthContext`, the cinema selector in `Sidebar.tsx`, `localStorage` cinema state) — that is a separate effort.
- Do NOT stage the pre-existing `package-lock.json` working-tree change; never `git add -A`. Stage only the files each task names.
- Keep: tickets, memberships (ticket-only benefits), reports, screens, engagements, films, and the Integrations page with its Stripe Connect wiring (`getConnectStatus`, `startOnboarding`, `getTerminalConnectionToken`).
- All internal router links are relative (e.g. `/engagements`), `basename="/dashboard"`.

---

### Task 1: Make membership benefit UI ticket-only

**Files:**
- Modify: `src/pages/TierDetail.tsx`
- Modify: `src/api/types.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `BenefitScope = 'TICKET' | 'RENTAL'`; benefit `ConditionType` without the three `CONCESSION_*` members; `TierDetail.tsx` no longer imports `concessionsApi`. (This decouples `TierDetail` from `concessions.ts`, which Task 4 deletes.)

- [ ] **Step 1: Narrow the benefit types in `src/api/types.ts`**

Change `BenefitScope` (around line 197) from:
```ts
export type BenefitScope = 'TICKET' | 'CONCESSION' | 'RENTAL';
```
to:
```ts
export type BenefitScope = 'TICKET' | 'RENTAL';
```
And in the benefit `ConditionType` union (around lines 205–207) delete the three lines:
```ts
  | 'CONCESSION_CATEGORY'
  | 'CONCESSION_ITEM'
  | 'CONCESSION_VARIATION';
```
(Make the member before them the end of the union — ensure the `;` lands on the new last member.)

- [ ] **Step 2: Remove concession usage from `src/pages/TierDetail.tsx`**

Remove each of these:
- The import `import { concessionsApi } from '../api/concessions';` (line ~7).
- The `CONCESSION:` key block in the condition-type map (the `CONCESSION: [ ... ]` entry listing `CONCESSION_CATEGORY/ITEM/VARIATION` + `BIRTHDAY_MONTH`, lines ~42–49).
- The three display-name branches `if (condition_type === 'CONCESSION_CATEGORY') {...}`, `'CONCESSION_ITEM'`, `'CONCESSION_VARIATION'` (lines ~152–175).
- The two queries `concessionCategories` (`queryKey: ['concession-categories']`) and `concessionItems` (`queryKey: ['concession-items']`) (lines ~190–197).
- The three JSX selector blocks for concession category / item / variation in the condition form (lines ~645–720, the blocks commented `{/* Concession category selector */}`, `{/* Concession item selector */}`, `{/* Concession variation selector */}`).
- The scope `<option value="CONCESSION">Concession</option>` (line ~1002).

After removal, grep to confirm: `grep -niE "concession" src/pages/TierDetail.tsx` returns nothing.

- [ ] **Step 3: Verify**

Run: `npm run build && npm run test:run && npm run lint`
Expected: build succeeds (tsc finds no dangling refs), tests pass, lint clean. If tsc reports an unused variable from a half-removed block, finish removing that block.

- [ ] **Step 4: Commit**

```bash
git add src/pages/TierDetail.tsx src/api/types.ts
git commit -m "refactor(memberships): make benefit-rule UI ticket-only"
```

---

### Task 2: Remove the POS page

**Files:**
- Delete: `src/pages/POS.tsx`, `src/pages/POS.module.css`, `src/utils/escpos.ts`, `src/utils/escpos.test.ts`
- Modify: `src/api/payments.ts`, `src/App.tsx`, `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `paymentsApi` without `createPOSSale`; no `/pos` route or nav entry. `payments.ts` keeps `getConnectStatus`, `startOnboarding`, `createPaymentIntent`, `refundPayment`, `getTerminalConnectionToken` (Integrations uses the Connect ones).

- [ ] **Step 1: Delete the POS page + ESC/POS util**

```bash
git rm src/pages/POS.tsx src/pages/POS.module.css src/utils/escpos.ts src/utils/escpos.test.ts
```

- [ ] **Step 2: Remove the dead POS call from `src/api/payments.ts`**

Delete the `createPOSSale` method (the `// POS Sales` block, lines ~80–84) and remove `POSSaleCreate` and `POSSaleResponse` from the `import type { ... } from './types';` block at the top (keep `PaymentIntentResponse`, `PaymentRecord`, `StripeAccountStatus`).

- [ ] **Step 3: Remove the POS route + import from `src/App.tsx`**

Delete `import POS from './pages/POS';` and the route `<Route path="pos" element={<POS />} />`.

- [ ] **Step 4: Remove the POS nav entry + icon from `src/components/Sidebar.tsx`**

Delete the nav item `{ path: '/pos', label: 'POS', icon: <POSIcon /> },` and the `POSIcon` component definition (around line 170). Confirm `POSIcon` is not referenced elsewhere.

- [ ] **Step 5: Verify**

Run: `npm run build && npm run test:run && npm run lint`
Expected: pass. (`escpos.test.ts` is gone so vitest count drops; no other test referenced it.)

- [ ] **Step 6: Commit**

```bash
git add src/api/payments.ts src/App.tsx src/components/Sidebar.tsx
git commit -m "refactor(pos): remove POS page, ESC/POS util, and pos/sales call"
```

---

### Task 3: Remove the Online Orders page

**Files:**
- Delete: `src/pages/OnlineOrders.tsx`, `src/pages/OnlineOrders.module.css`, `src/api/onlineOrders.ts`
- Modify: `src/api/index.ts`, `src/App.tsx`, `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: no `onlineOrdersApi` export, no `/online-orders` route or nav entry.

- [ ] **Step 1: Delete the page + API client**

```bash
git rm src/pages/OnlineOrders.tsx src/pages/OnlineOrders.module.css src/api/onlineOrders.ts
```

- [ ] **Step 2: Remove the export from `src/api/index.ts`**

Delete the line `export { default as onlineOrdersApi } from './onlineOrders';`.

- [ ] **Step 3: Remove route + import from `src/App.tsx`**

Delete `import OnlineOrders from './pages/OnlineOrders';` and the `ManagerRoute`-wrapped block:
```tsx
          <Route
            path="online-orders"
            element={
              <ManagerRoute>
                <OnlineOrders />
              </ManagerRoute>
            }
          />
```

- [ ] **Step 4: Remove nav entry + icon from `src/components/Sidebar.tsx`**

Delete the nav item block:
```tsx
    {
      path: '/online-orders',
      label: 'Online Orders',
      icon: <OnlineOrdersIcon />,
      managerOnly: true,
    },
```
and the `OnlineOrdersIcon` component (around line 89). Confirm it's unreferenced after.

- [ ] **Step 5: Verify**

Run: `npm run build && npm run test:run && npm run lint`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/api/index.ts src/App.tsx src/components/Sidebar.tsx
git commit -m "refactor(online-orders): remove Online Orders page and API client"
```

---

### Task 4: Remove Concessions, Modifiers, and Taxes pages

**Files:**
- Delete: `src/pages/Concessions.tsx`, `src/pages/Concessions.module.css`, `src/pages/ConcessionItemDetail.tsx`, `src/pages/ConcessionItemDetail.module.css`, `src/pages/Modifiers.tsx`, `src/pages/Modifiers.module.css`, `src/pages/Taxes.tsx`, `src/pages/Taxes.module.css`, `src/api/concessions.ts`, `src/api/taxes.ts`, `cypress/e2e/concession-items.cy.ts`, `cypress/e2e/concession-item-detail.cy.ts`, `cypress/e2e/modifiers.cy.ts`
- Modify: `src/api/index.ts`, `src/App.tsx`, `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: Task 1 (TierDetail no longer imports `concessionsApi`, so `concessions.ts` can be deleted).
- Produces: no `concessionsApi`/`taxesApi` exports; no concession/modifier/taxes routes or nav.

- [ ] **Step 1: Delete the pages, API clients, and cypress specs**

```bash
git rm src/pages/Concessions.tsx src/pages/Concessions.module.css \
       src/pages/ConcessionItemDetail.tsx src/pages/ConcessionItemDetail.module.css \
       src/pages/Modifiers.tsx src/pages/Modifiers.module.css \
       src/pages/Taxes.tsx src/pages/Taxes.module.css \
       src/api/concessions.ts src/api/taxes.ts \
       cypress/e2e/concession-items.cy.ts cypress/e2e/concession-item-detail.cy.ts \
       cypress/e2e/modifiers.cy.ts
```

- [ ] **Step 2: Remove exports from `src/api/index.ts`**

Delete the lines `export { default as concessionsApi } from './concessions';` and `export { taxesApi } from './taxes';`.

- [ ] **Step 3: Remove routes + imports from `src/App.tsx`**

Delete these imports:
```tsx
import Concessions from './pages/Concessions';
import ConcessionItemDetail from './pages/ConcessionItemDetail';
import Modifiers from './pages/Modifiers';
import Taxes from './pages/Taxes';
```
and these routes:
```tsx
          <Route path="concessions" element={<Concessions />} />
          <Route path="concessions/:id" element={<ConcessionItemDetail />} />
          <Route path="modifiers" element={<Modifiers />} />
          <Route
            path="taxes"
            element={
              <ManagerRoute>
                <Taxes />
              </ManagerRoute>
            }
          />
```

- [ ] **Step 4: Remove nav entries + icons from `src/components/Sidebar.tsx`**

Delete the Concessions group nav block:
```tsx
    {
      label: 'Concessions',
      icon: <ConcessionsIcon />,
      items: [
        { path: '/concessions', label: 'Items & Categories' },
        { path: '/modifiers', label: 'Modifiers' },
      ],
    },
```
and the Taxes nav item `{ path: '/taxes', label: 'Taxes', icon: <TaxesIcon />, managerOnly: true },`, plus the now-unused `ConcessionsIcon` and `TaxesIcon` component definitions. Confirm both icons are unreferenced after.

- [ ] **Step 5: Verify**

Run: `npm run build && npm run test:run && npm run lint`
Expected: pass. Then typecheck cypress: `npx tsc -p tsconfig.cypress.json --noEmit` — expected clean (remaining specs don't reference the deleted ones).

- [ ] **Step 6: Commit**

```bash
git add src/api/index.ts src/App.tsx src/components/Sidebar.tsx
git commit -m "refactor(concessions): remove Concessions, Modifiers, and Taxes pages"
```

---

### Task 5: Remove the Embeds page and the embeddable widget

**Files:**
- Delete: `src/pages/Embeds.tsx`, `src/pages/Embeds.module.css`, the entire `src/widget/` directory, `vite.config.widget.ts`
- Modify: `src/App.tsx`, `src/components/Sidebar.tsx`, `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: no `/embeds` route or nav entry; no widget build target.

- [ ] **Step 1: Delete the Embeds page, the widget, and its vite config**

```bash
git rm src/pages/Embeds.tsx src/pages/Embeds.module.css vite.config.widget.ts
git rm -r src/widget
```

- [ ] **Step 2: Remove the widget build scripts in `package.json`**

Delete the `"build:widget": "vite build --config vite.config.widget.ts",` line. Change `"build:all"` from
```json
    "build:all": "tsc -b && vite build && vite build --config vite.config.widget.ts",
```
to
```json
    "build:all": "tsc -b && vite build",
```
(Keep `build:all` as an alias of `build` so any external caller/CI still resolves; do not delete it.)

- [ ] **Step 3: Remove route + import from `src/App.tsx`**

Delete `import Embeds from './pages/Embeds';` and the route `<Route path="embeds" element={<Embeds />} />`.

- [ ] **Step 4: Remove nav entry + icon from `src/components/Sidebar.tsx`**

Delete the nav item `{ path: '/embeds', label: 'Embeds', icon: <EmbedsIcon /> },` and the `EmbedsIcon` component (around line 103). Confirm unreferenced.

- [ ] **Step 5: Verify**

Run: `npm run build && npm run test:run && npm run lint`
Expected: pass (the main `vite build` no longer references the widget). Confirm `grep -rn "widget" src` returns nothing.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/Sidebar.tsx package.json
git commit -m "refactor(embeds): remove Embeds page and embeddable ticketing widget"
```

---

### Task 6: Final cleanup — types, Integrations copy, navigation spec

**Files:**
- Modify: `src/api/types.ts`, `src/pages/Integrations.tsx`, `cypress/e2e/navigation.cy.ts`

**Interfaces:**
- Consumes: Tasks 2–5 (all consumers of the concession/POS/online-order types are gone).
- Produces: `types.ts` free of concession/POS/online-order interfaces; Integrations copy without "POS"; navigation spec without removed-nav assertions.

- [ ] **Step 1: Remove now-unused interfaces from `src/api/types.ts`**

Delete the concession block (the `// Concessions` section: `ConcessionVariation`, `ConcessionItem`, `ConcessionItemCreate`, `ConcessionVariationCreate`, `ConcessionCategory`, `ConcessionCategoryCreate`, lines ~397–510), the `POSConcessionItem`, POS sale request/response interfaces (`POSSaleCreate`, `POSSaleResponse`, and any `POS*`/benefit-preview interface with a `scope: 'TICKET' | 'CONCESSION'` field, lines ~562–640), and the online-order interfaces. After each deletion, rely on `npm run build` to confirm nothing retained still imports them — if tsc reports a type still in use, keep that one and note it.

- [ ] **Step 2: Drop "POS" wording in `src/pages/Integrations.tsx`**

Update the two copy strings: `Accept card payments online and at the POS` → `Accept card payments online`; `In-person card reader for POS transactions` → `In-person card reader for transactions`. Leave all `paymentsApi` wiring intact.

- [ ] **Step 3: Update `cypress/e2e/navigation.cy.ts`**

Remove the assertions/visits referencing the removed nav entries and routes (POS, Online Orders, Concessions, Modifiers, Taxes, Embeds). Keep assertions for retained nav (Home, Engagements, Screens, Memberships, Reports, Tickets, Integrations).

- [ ] **Step 4: Verify**

Run: `npm run build && npm run test:run && npm run lint`
Expected: pass. Then `npx tsc -p tsconfig.cypress.json --noEmit` — expected clean.
Final grep gate (expect no hits in `src` outside retained Stripe/ticket usage):
`grep -rniE "concession|onlineorder|online-order|/pos\b|POSSale|escpos|widget" src --include="*.ts" --include="*.tsx"`

- [ ] **Step 5: Commit**

```bash
git add src/api/types.ts src/pages/Integrations.tsx cypress/e2e/navigation.cy.ts
git commit -m "chore: drop unused concession/POS/online-order types and stale copy"
```

---

## Self-Review Notes

- **Spec coverage:** pages removal (Tasks 2–5), API clients (Tasks 2–4), escpos (Task 2), widget+vite config+scripts (Task 5), routes/nav (every task), benefit-UI concession refs (Task 1), payments.ts trim (Task 2), Integrations copy (Task 6), types.ts (Task 6), cypress (Tasks 4 & 6). All spec items mapped.
- **Build-green ordering:** Task 1 decouples `TierDetail` from `concessionsApi` before Task 4 deletes `concessions.ts`; `api/index.ts` exports are removed in the same task that deletes their module (Tasks 2–4); unused `types.ts` interfaces (which don't break `tsc`) are deferred to Task 6.
- **Type consistency:** `BenefitScope`/`ConditionType` narrowed once (Task 1); `paymentsApi` surface change stated in Task 2's Produces and matches Task 6's type cleanup.
- **Out-of-scope guard:** no task touches `AuthContext`/cinema-selector; no `git add -A` (protects the pre-existing `package-lock.json` change).
