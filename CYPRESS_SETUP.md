# Cypress E2E Testing Setup - Complete

This document summarizes the comprehensive Cypress end-to-end testing setup for the LeprinceOS React dashboard.

## What Was Implemented

### 1. Core Setup

✅ **Cypress Installation**
- Installed Cypress 15.9.0 and @cypress/vite-dev-server
- Configured for React/TypeScript project
- Integrated with existing Vite build system

✅ **Configuration Files**
- `cypress.config.ts` - Main Cypress configuration
- `cypress/support/e2e.ts` - Global hooks and setup
- `cypress/support/index.d.ts` - TypeScript definitions for custom commands

### 2. Custom Commands

Created reusable commands in `cypress/support/commands.ts`:

- `cy.login(username, password)` - Real API authentication with session caching
- `cy.logout()` - User logout
- `cy.mockAuthSession(userData?)` - Mock authentication for isolated tests
- `cy.selectCinema(cinemaId)` - Cinema switching
- `cy.dataCy(value)` - Shorthand for data-cy selectors
- `cy.waitForApi(alias, status)` - API request validation
- `cy.setMobileViewport()` / `cy.setTabletViewport()` / `cy.setDesktopViewport()` - Responsive testing helpers

### 3. Test Fixtures

Created realistic mock data in `cypress/fixtures/`:

- `user.json` - User with multiple cinema memberships
- `engagements.json` - Film engagement data
- `concessions.json` - Concession items
- `tickets.json` - Ticket types
- `modifiers.json` - Modifier items
- `screens.json` - Cinema screens

### 4. Test Suites (2,152 lines of test code)

#### Authentication Tests (`auth.cy.ts`)
- Login with mock backend
- User data loading and cinema selection
- Session persistence across reloads
- Session expiration handling
- Protected route access control
- Cinema switching functionality
- **Total: ~200 lines**

#### Navigation Tests (`navigation.cy.ts`)
- Main navigation links
- Direct URL access
- Browser back/forward buttons
- Active link highlighting
- Layout persistence
- Responsive navigation
- 404 handling
- **Total: ~350 lines**

#### Engagements CRUD Tests (`engagements.cy.ts`)
- List view with data display
- Empty state handling
- Detail page navigation
- Create form with validation
- Update existing engagements
- Delete with confirmation
- Date range validation
- API error handling
- Responsive layouts (mobile/desktop)
- **Total: ~550 lines**

#### Concessions CRUD Tests (`concessions.cy.ts`)
- List view and filtering by category
- Create/edit/delete operations
- Price validation (format, positive values)
- Active/inactive status toggling
- Search functionality
- Long item name handling
- Decimal price handling
- Responsive layouts
- **Total: ~500 lines**

#### Tickets Tests (`tickets.cy.ts`)
- Ticket type listing
- Create/edit/delete operations
- Price validation
- Detail page navigation
- **Total: ~250 lines**

#### Modifiers Tests (`modifiers.cy.ts`)
- Modifier listing
- Category filtering (applies_to)
- Create with zero price (free modifiers)
- Update and delete operations
- Responsive layouts
- **Total: ~300 lines**

### 5. Component Enhancements

Added `data-cy` attributes to key components for reliable selectors:

**Drawer Component:**
- `data-cy="drawer"` - Main drawer container
- `data-cy="drawer-overlay"` - Backdrop overlay
- `data-cy="drawer-title"` - Drawer title
- `data-cy="drawer-close"` - Close button
- `data-cy="drawer-content"` - Content area
- `data-cy="drawer-footer"` - Footer area

**Sidebar Component:**
- `data-cy="sidebar"` - Main sidebar
- `data-cy="sidebar-logo"` - Brand logo
- `data-cy="cinema-selector"` - Cinema selector dropdown
- `data-cy="cinema-selector-toggle"` - Dropdown toggle
- `data-cy="sidebar-nav"` - Navigation container
- `data-cy="nav-link-{name}"` - Dynamic nav links (e.g., `nav-link-home`)
- `data-cy="username"` - Username display
- `data-cy="logout-button"` - Logout button

### 6. NPM Scripts

Added to `package.json`:

```json
{
  "cypress:open": "cypress open",           // Interactive mode
  "cypress:run": "cypress run",             // Headless mode
  "cypress:run:chrome": "cypress run --browser chrome",
  "cypress:run:firefox": "cypress run --browser firefox",
  "e2e": "cypress run",                     // Alias
  "e2e:open": "cypress open"                // Alias
}
```

### 7. Documentation

Created comprehensive documentation:

- `cypress/README.md` - Complete testing guide (500+ lines)
  - Getting started instructions
  - Running tests (interactive and headless)
  - Test structure and conventions
  - Writing tests guide
  - Custom commands reference
  - Best practices
  - Debugging tips
  - CI/CD integration examples
  - Troubleshooting guide

- `CYPRESS_SETUP.md` - This file

## Test Coverage

### User Flows Covered

✅ **Authentication**
- Login and logout
- Session management
- Multi-cinema support
- Protected routes

✅ **Navigation**
- Sidebar navigation
- Direct URL access
- Browser navigation (back/forward)
- Responsive menu (mobile/desktop)

✅ **CRUD Operations**
- Engagements (films)
- Concessions (items)
- Tickets (types)
- Modifiers

✅ **Form Validation**
- Required fields
- Data type validation
- Business logic validation (e.g., date ranges)

✅ **Error Handling**
- API errors (4xx, 5xx)
- Empty states
- 404 pages
- Network failures

✅ **Responsive Design**
- Mobile viewports (375x667)
- Tablet viewports (768x1024)
- Desktop viewports (1280x720)

### Test Execution Strategy

Tests use **network interception** (mocking) by default for:
- Fast execution
- Consistent results
- No database pollution
- Isolated test runs

Tests can be adapted for **real backend integration** by:
- Removing `cy.intercept()` calls
- Using `cy.login()` for real authentication
- Testing against development backend

## Getting Started

### Prerequisites

1. **Backend running:**
   ```bash
   cd /path/to/api_leprinceos_com
   python manage.py runserver
   ```

2. **Frontend dev server:**
   ```bash
   cd www_leprinceos_com
   npm run dev
   ```

### Run Tests

**Interactive (recommended for development):**
```bash
npm run cypress:open
```

**Headless (for CI/CD):**
```bash
npm run cypress:run
```

## Project Structure

```
www_leprinceos_com/
├── cypress/
│   ├── e2e/                    # Test specs (6 files, 2,152 lines)
│   │   ├── auth.cy.ts
│   │   ├── navigation.cy.ts
│   │   ├── engagements.cy.ts
│   │   ├── concessions.cy.ts
│   │   ├── tickets.cy.ts
│   │   └── modifiers.cy.ts
│   ├── fixtures/               # Mock data (6 files)
│   │   ├── user.json
│   │   ├── engagements.json
│   │   ├── concessions.json
│   │   ├── tickets.json
│   │   ├── modifiers.json
│   │   └── screens.json
│   ├── support/                # Custom commands & config
│   │   ├── commands.ts         # Custom Cypress commands
│   │   ├── e2e.ts              # Global configuration
│   │   └── index.d.ts          # TypeScript definitions
│   └── README.md               # Testing guide
├── src/
│   ├── components/
│   │   ├── Drawer.tsx          # ✨ Enhanced with data-cy
│   │   └── Sidebar.tsx         # ✨ Enhanced with data-cy
│   └── ...
├── cypress.config.ts           # Cypress configuration
├── package.json                # ✨ Added test scripts
└── CYPRESS_SETUP.md           # This file
```

## Testing Philosophy

These tests follow the **Testing Trophy** approach:

1. **Integration Tests** (majority) - Test components working together
2. **E2E Tests** (critical paths) - Test real user journeys
3. **Unit Tests** (utilities) - Already covered by Vitest

### Key Principles Applied

✅ **Test Behavior, Not Implementation**
- Tests verify what users see and do
- Tests don't rely on internal state or component structure

✅ **Resilient Selectors**
- Prefer role-based queries (`cy.contains('button', /submit/i)`)
- Use semantic HTML attributes
- data-cy attributes for complex selectors

✅ **No Arbitrary Waits**
- All waits are based on network requests or element visibility
- Using `cy.wait('@alias')` for API calls
- Cypress auto-retry prevents flakiness

✅ **Independent Tests**
- Each test can run in isolation
- No shared state between tests
- BeforeEach hooks reset state

✅ **Comprehensive Coverage**
- Happy paths
- Error states
- Edge cases
- Responsive layouts

## Next Steps

### Recommended Enhancements

1. **Visual Regression Testing**
   - Add cypress-plugin-snapshots
   - Capture screenshots of key pages
   - Detect UI regressions

2. **Accessibility Testing**
   - Add cypress-axe plugin
   - Test ARIA attributes
   - Keyboard navigation

3. **Performance Testing**
   - Measure page load times
   - Monitor API response times
   - Set performance budgets

4. **Real Backend Tests**
   - Create a separate test suite for integration with real backend
   - Use test database
   - Clean up test data after runs

5. **Code Coverage**
   - Add @cypress/code-coverage
   - Track which code paths are tested
   - Identify gaps in coverage

6. **Parallel Execution**
   - Use Cypress Cloud for parallel runs
   - Reduce CI/CD time
   - Better test reporting

## Maintenance

### When Adding New Features

1. **Write E2E tests for critical paths**
   - Create new spec file or add to existing
   - Follow naming convention: `feature.cy.ts`
   - Add fixtures for mock data

2. **Add data-cy attributes to new components**
   - Use semantic names: `data-cy="submit-form"`
   - Document in component JSDoc

3. **Update fixtures when API changes**
   - Keep mock data in sync with backend
   - Test with real API to verify accuracy

### When Refactoring

1. **Run tests before changes**
   ```bash
   npm run cypress:run
   ```

2. **Keep tests green during refactoring**
   - Tests should not break if behavior is unchanged
   - Update selectors only if HTML structure changes significantly

3. **Update documentation**
   - Update cypress/README.md if patterns change
   - Document new custom commands

## CI/CD Integration

### GitHub Actions

See `cypress/README.md` for complete GitHub Actions workflow example.

Key steps:
1. Start Django backend
2. Start Vite dev server
3. Wait for servers to be ready
4. Run Cypress tests
5. Upload screenshots/videos on failure

### GitLab CI

```yaml
cypress:
  stage: test
  image: cypress/browsers:node18.12.0-chrome106-ff106
  script:
    - npm ci
    - npm run dev &
    - npx wait-on http://localhost:5173
    - npm run cypress:run
  artifacts:
    when: on_failure
    paths:
      - cypress/screenshots/
      - cypress/videos/
```

## Troubleshooting

### Common Issues

1. **Tests timeout**
   - Ensure backend and frontend are running
   - Check network intercepts are properly aliased
   - Increase timeout in cypress.config.ts if needed

2. **Flaky tests**
   - Remove arbitrary `cy.wait(ms)` calls
   - Add proper `cy.wait('@apiAlias')` for network requests
   - Check for race conditions in application code

3. **Element not found**
   - Verify selector is correct
   - Check if element appears after async operation
   - Use `.should('be.visible')` to wait for element

See `cypress/README.md` for more troubleshooting tips.

## Resources

- **Cypress Documentation:** https://docs.cypress.io/
- **Best Practices:** https://docs.cypress.io/guides/references/best-practices
- **TypeScript Support:** https://docs.cypress.io/guides/tooling/typescript-support
- **Network Requests:** https://docs.cypress.io/guides/guides/network-requests

## Success Metrics

This Cypress setup provides:

✅ **2,152 lines of test code** covering critical user journeys
✅ **6 test suites** for different features
✅ **6 custom commands** for common operations
✅ **6 fixture files** for realistic test data
✅ **Comprehensive documentation** (500+ lines)
✅ **TypeScript support** throughout
✅ **Responsive testing** (mobile, tablet, desktop)
✅ **Error handling** tests
✅ **Form validation** tests
✅ **Navigation** tests
✅ **CRUD operations** tests

The test suite is ready for:
- Local development
- CI/CD integration
- Regression testing
- Feature development validation

---

**Setup Date:** 2026-01-30
**Cypress Version:** 15.9.0
**Framework:** React 19 + TypeScript + Vite
