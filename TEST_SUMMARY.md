# React Frontend Test Suite Summary

## Overview

Comprehensive Vitest test suite created for the LeprinceOS Cinema Management Platform React dashboard. All tests follow best practices and the testing trophy philosophy.

## Test Statistics

- **Total Tests:** 112
- **Test Files:** 7
- **Status:** ✅ All tests passing
- **Duration:** ~2 seconds

## Test Coverage by Category

### 1. Utility Functions (19 tests)
**File:** `src/utils/timezone.test.ts`

Tests for timezone utilities that handle date/time formatting across different timezones:
- ✅ `formatInTimezone()` - Formatting dates with timezone and locale options
- ✅ `getDateInTimezone()` - YYYY-MM-DD date extraction
- ✅ `getTimeInTimezone()` - HH:MM time extraction in 24-hour format
- ✅ `formatDateTime()` - Full datetime display formatting
- ✅ `formatTime()` - 12-hour time formatting with AM/PM
- ✅ `formatDate()` - Date-only formatting
- ✅ `getTodayInTimezone()` - Current date in specific timezone
- ✅ Edge cases: timezone boundaries, DST transitions, invalid timezones

**Key Testing Principles:**
- Tests actual behavior, not implementation
- Covers timezone edge cases (midnight boundaries, DST)
- Validates format consistency

### 2. API Client Helpers (12 tests)
**File:** `src/api/client.test.ts`

Tests for API client utility functions:
- ✅ CSRF token management (cookie and programmatic storage)
- ✅ Cinema ID management (localStorage)
- ✅ Token precedence (cookie over programmatic)
- ✅ Cookie parsing with multiple values
- ✅ Independent token and cinema ID management

**Key Testing Principles:**
- Isolated testing of helper functions
- No mocking of complex axios interceptors
- Focus on observable behavior

### 3. Authentication API (11 tests)
**File:** `src/api/auth.test.ts`

Tests for the authentication API module:
- ✅ Login with credential validation
- ✅ CSRF token storage on login
- ✅ Logout with state cleanup
- ✅ Error handling during logout (state cleanup in finally block)
- ✅ Get current user
- ✅ Handling users with multiple cinemas
- ✅ Handling superusers
- ✅ Network error handling

**Key Testing Principles:**
- API client is mocked, not real HTTP calls
- Validates side effects (localStorage, CSRF tokens)
- Tests error scenarios

### 4. Engagements API (20 tests)
**File:** `src/api/engagements.test.ts`

Tests for the engagements API module following the standard CRUD pattern:
- ✅ List engagements with and without filters
- ✅ Query string building (filtering empty values, encoding)
- ✅ Handling pagination metadata
- ✅ Get single engagement
- ✅ Create engagement (full and minimal data)
- ✅ Update engagement (full and partial updates)
- ✅ Delete engagement
- ✅ Error handling (404, validation errors)
- ✅ Edge cases (zero as valid ID, special characters)

**Key Testing Principles:**
- Tests demonstrate the standard API pattern used across all modules
- Validates DRF pagination unwrapping
- Tests query parameter filtering logic

### 5. AuthContext (16 tests)
**File:** `src/contexts/AuthContext.test.tsx`

Tests for the authentication context provider:
- ✅ Hook must be used within provider
- ✅ Loading state management
- ✅ Session restoration on mount
- ✅ Cinema selection from localStorage
- ✅ Fallback to first cinema
- ✅ Cinema switching
- ✅ Login flow
- ✅ Logout flow
- ✅ Context value shape

**Key Testing Principles:**
- Uses renderHook from React Testing Library
- Tests actual user-facing behavior
- Validates state transitions with waitFor
- Mocks API layer, not React internals

### 6. Drawer Component (24 tests)
**File:** `src/components/Drawer.test.tsx`

Tests for the reusable drawer/modal component:
- ✅ Rendering states (open/closed)
- ✅ Width variants (sm, md, lg)
- ✅ Footer rendering
- ✅ Accessibility (ARIA attributes, roles, labels)
- ✅ User interactions (close button, overlay click, Escape key)
- ✅ Body scroll lock
- ✅ Focus management (auto-focus, focus restoration, focus trap)
- ✅ Dynamic content updates
- ✅ Edge cases (no focusable elements, rapid toggles)

**Key Testing Principles:**
- Accessibility is a first-class concern
- Tests keyboard navigation and screen reader experience
- Validates focus management patterns
- Uses userEvent for realistic interactions

### 7. ProtectedRoute Component (10 tests)
**File:** `src/components/ProtectedRoute.test.tsx`

Tests for the route protection wrapper:
- ✅ Loading state display
- ✅ Rendering children when authenticated
- ✅ Not rendering content when unauthenticated
- ✅ Authentication re-checking on remount
- ✅ Error handling during auth check
- ✅ Edge cases (empty children, multiple children)

**Key Testing Principles:**
- Focused on behavior, not redirect implementation
- Tests integration with AuthContext
- Validates loading and error states

## Test Infrastructure

### Configuration
**File:** `vitest.config.ts`
- Environment: jsdom
- Global test utilities available
- Setup file: `src/test/setup.ts`
- Coverage exclusions: node_modules, test files, config files, type definitions

### Test Helpers
**File:** `src/test/helpers.tsx`
- `renderWithProviders()` - Render components with all required providers
- `AllProviders` - Wrapper with QueryClient, Router, and AuthProvider
- `createTestQueryClient()` - Isolated QueryClient for each test
- Mock data factories (mockUser, mockEngagement, mockShowtime, etc.)

### Setup
**File:** `src/test/setup.ts`
- Automatic cleanup after each test
- localStorage clearing
- Mock clearing
- window.matchMedia polyfill for jsdom

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm test:run

# Run tests with UI
npm test:ui

# Run tests with coverage (requires @vitest/coverage-v8)
npm test:coverage
```

## Testing Best Practices Demonstrated

### 1. Query Priorities
Tests use accessible queries in this order:
1. `getByRole` (most accessible)
2. `getByLabelText` (forms)
3. `getByPlaceholderText`
4. `getByText`
5. `getByTestId` (last resort, not used in this codebase)

### 2. User Interactions
- Always use `userEvent.setup()` and await interactions
- Never use `fireEvent` directly
- Test keyboard navigation alongside mouse events

### 3. Async Handling
- Use `findBy*` for elements appearing asynchronously
- Use `waitFor` for assertions that need to wait
- No arbitrary timeouts

### 4. Mocking Strategy
- Mock at boundaries (API calls, external services)
- Don't mock React or testing library internals
- Keep mocks realistic and minimal

### 5. Test Organization
- Group by feature/behavior, not implementation
- Use descriptive test names: "should [expected behavior] when [condition]"
- Arrange-Act-Assert pattern

## Coverage Areas

### Well-Covered
✅ Utility functions (timezone handling)
✅ API client helpers (CSRF, cinema ID)
✅ API modules (auth, engagements pattern)
✅ Authentication flow (login, logout, session)
✅ Reusable components (Drawer)
✅ Route protection
✅ Context providers

### Not Yet Covered
(Additional tests can be added for)
- Other API modules (concessions, tickets, showtimes, etc.)
- Page components (Home, Engagements, Tickets, etc.)
- Other reusable components (Layout, Sidebar, etc.)
- Integration tests for complete user flows
- E2E tests for critical paths

## Extending the Test Suite

When adding new tests, follow these patterns:

### For New API Modules
See `src/api/engagements.test.ts` as the canonical example. Test:
- List with and without filters
- Get single item
- Create (success and validation errors)
- Update (full and partial)
- Delete
- Query string building edge cases

### For New Components
See `src/components/Drawer.test.tsx` as the example. Test:
- Rendering in different states
- Accessibility (ARIA, keyboard navigation)
- User interactions
- Dynamic content/prop changes
- Edge cases

### For New Contexts
See `src/contexts/AuthContext.test.tsx` as the example. Test:
- Hook outside provider throws error
- Initial state
- State transitions
- Side effects (localStorage, API calls)
- Error states

## Notes

- All tests follow the testing trophy: emphasis on integration tests
- Tests verify user-facing behavior, not implementation details
- Accessibility is tested as a first-class concern
- Tests are resilient to refactoring
- No flaky tests - all async handled properly with waitFor
