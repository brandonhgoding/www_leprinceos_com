# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React dashboard frontend for LeprinceOS cinema management platform. This SPA is served at `/dashboard` and communicates with the Django backend API at `/api`.

**Tech Stack:** React 19, TypeScript, Vite, React Query, React Router, Axios

## Commands

```bash
# Development server (runs on localhost:5173, proxies /api to Django on :8000)
npm run dev

# Production build (outputs to dist/)
npm run build

# Linting
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Backend Integration

- **API Proxy:** Vite proxies `/api` requests to Django backend at `localhost:8000`
- **Authentication:** Session-based auth via Django; CSRF token read from `csrftoken` cookie
- **Multi-tenancy:** Cinema resolved server-side via host/session; cinema selection persisted in `localStorage`
- **401 Handling:** Automatic redirect to `/login` (Django-served page)

### Key Directories

```
src/
├── api/           # API client modules (one per domain)
│   ├── client.ts  # Axios instance with CSRF & cinema headers
│   ├── types.ts   # Shared TypeScript interfaces
│   └── *.ts       # Domain-specific API functions
├── components/    # Reusable UI components
├── contexts/      # React contexts (AuthContext for user/cinema state)
├── pages/         # Route components (one per feature)
└── utils/         # Utility functions (timezone handling)
```

### Routing

- Uses `BrowserRouter` with `basename="/dashboard"`
- All internal links should be relative (e.g., `/engagements` not `/dashboard/engagements`)
- Routes protected by `ProtectedRoute` component which validates session via `AuthContext`

### State Management

- **Server State:** React Query for all API data (5-minute stale time)
- **Auth State:** `AuthContext` manages user, current cinema, and cinema switching
- **Cinema Selection:** Persisted to `localStorage` as `selected_cinema_id`

### UI Patterns

- **Design System:** CSS custom properties defined in `src/index.css` (luxury cinema aesthetic: brass accents, cream backgrounds, Playfair Display headings)
- **Styling:** CSS Modules (`.module.css` files colocated with components)
- **Forms:** Slide-in `Drawer` component for all create/edit forms
- **Tables:** Desktop table view with mobile card layout at ≤768px breakpoint

### API Module Pattern

Each API module exports a default object with CRUD methods:
```typescript
// src/api/engagements.ts
export default {
  list: (params?) => apiClient.get('/v1/engagements/', { params }).then(handlePagination),
  get: (id) => apiClient.get(`/v1/engagements/${id}/`).then(r => r.data),
  create: (data) => apiClient.post('/v1/engagements/', data).then(r => r.data),
  update: (id, data) => apiClient.patch(`/v1/engagements/${id}/`, data).then(r => r.data),
  delete: (id) => apiClient.delete(`/v1/engagements/${id}/`),
}
```

DRF pagination is handled by extracting `.results` from paginated responses.
