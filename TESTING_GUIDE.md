# Testing Guide - LeprinceOS Cinema Dashboard

Complete guide for running and maintaining the comprehensive test suite for the React frontend.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Types](#test-types)
3. [Running Tests](#running-tests)
4. [Test Structure](#test-structure)
5. [Writing New Tests](#writing-new-tests)
6. [Debugging](#debugging)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

```bash
# Ensure dependencies are installed
npm install

# Make sure backend is running (for full integration)
cd ../api_leprinceos_com
python manage.py runserver
# Backend runs on http://localhost:8000

# Return to frontend directory
cd ../www_leprinceos_com

# Start frontend dev server
npm run dev
# Frontend runs on http://localhost:5173
```

### Run All E2E Tests

```bash
# Interactive mode (recommended for development)
npm run cypress:open

# Headless mode (for CI/CD)
npm run cypress:run
```

---

## Test Types

### 1. End-to-End Tests (E2E)
**Location:** `cypress/e2e/`
**Count:** 180+ tests across 10 files
**Purpose:** Test complete user workflows

**Files:**
- `auth.cy.ts` - Authentication flows
- `navigation.cy.ts` - Navigation and routing
- `home.cy.ts` - Dashboard homepage ✨
- `showtimes.cy.ts` - Showtime management ✨
- `screens.cy.ts` - Screen management ✨
- `sales-taxes.cy.ts` - Sales tax configuration ✨
- `engagements.cy.ts` - Film engagement CRUD
- `concessions.cy.ts` - Concession item management
- `tickets.cy.ts` - Ticket type management
- `modifiers.cy.ts` - Modifier management

### 2. Component Tests
**Location:** `src/components/*.test.tsx`
**Framework:** Vitest + React Testing Library
**Purpose:** Test individual components in isolation

```bash
# Run component tests
npm run test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

---

## Running Tests

### Interactive Mode (Development)

Best for writing and debugging tests:

```bash
npm run cypress:open
# or
npm run e2e:open
```

This opens the Cypress UI where you can:
- Select specific test files to run
- Watch tests run in real browser
- Time-travel through test steps
- Debug with DevTools

### Headless Mode (CI/CD)

Best for automated testing:

```bash
# All tests
npm run cypress:run
# or
npm run e2e

# Specific browser
npm run cypress:run:chrome
npm run cypress:run:firefox

# Specific test file
npx cypress run --spec "cypress/e2e/showtimes.cy.ts"

# Multiple test files
npx cypress run --spec "cypress/e2e/{home,showtimes,screens}.cy.ts"
```

### Filtering Tests

```bash
# Run tests matching pattern
npx cypress run --spec "cypress/e2e/**/auth*.cy.ts"

# Run specific describe block (requires --grep plugin)
npx cypress run --env grep="Create Showtime"
```

---

## Test Structure

### File Organization

```
www_leprinceos_com/
├── cypress/
│   ├── e2e/                    # Test specs (10 files)
│   │   ├── auth.cy.ts
│   │   ├── home.cy.ts
│   │   ├── showtimes.cy.ts
│   │   └── ...
│   ├── fixtures/               # Mock data (8 files)
│   │   ├── user.json
│   │   ├── showtimes.json
│   │   └── ...
│   ├── support/                # Custom commands & config
│   │   ├── commands.ts         # Custom Cypress commands
│   │   ├── e2e.ts              # Global configuration
│   │   └── index.d.ts          # TypeScript definitions
│   ├── README.md               # Detailed Cypress documentation
│   ├── BUG_REPORT.md          # Bug findings report
│   └── E2E_TEST_SUMMARY.md    # Test suite summary
├── cypress.config.ts           # Cypress configuration
├── TESTING_GUIDE.md           # This file
└── ...
```

### Test Anatomy

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup: Mock API, authenticate, set state
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser')
    })
  })

  describe('Specific Functionality', () => {
    it('should do something specific', () => {
      // Arrange: Visit page, set up data
      cy.visit('/dashboard/feature')
      cy.wait('@getCurrentUser')

      // Act: Perform actions
      cy.contains('button', 'Click Me').click()

      // Assert: Verify results
      cy.contains('Success').should('be.visible')
    })
  })
})
```

---

## Writing New Tests

### 1. Create Test File

```bash
# Create new test file
touch cypress/e2e/my-feature.cy.ts
```

### 2. Basic Template

```typescript
describe('My Feature', () => {
  beforeEach(() => {
    // Set up authentication
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser')
    })

    // Set up local storage
    cy.window().then((win) => {
      win.localStorage.setItem('selected_cinema_id', '1')
    })

    // Mock API endpoints
    cy.intercept('GET', '/api/v1/my-endpoint/', {
      statusCode: 200,
      body: { count: 0, results: [] },
    }).as('getMyData')
  })

  it('should display the page', () => {
    cy.visit('/dashboard/my-feature')
    cy.wait('@getCurrentUser')
    cy.wait('@getMyData')

    cy.contains('h1', 'My Feature').should('be.visible')
  })

  it('should create new item', () => {
    cy.visit('/dashboard/my-feature')
    cy.wait('@getCurrentUser')

    cy.intercept('POST', '/api/v1/my-endpoint/', {
      statusCode: 201,
      body: { id: 1, name: 'New Item' },
    }).as('createItem')

    cy.contains('button', 'Create').click()
    cy.get('input[name="name"]').type('New Item')
    cy.contains('button', 'Submit').click()

    cy.wait('@createItem')
  })
})
```

### 3. Add Test Fixture

```bash
# Create fixture file
touch cypress/fixtures/my-feature.json
```

```json
{
  "count": 2,
  "results": [
    {
      "id": 1,
      "name": "Item 1",
      "description": "First item"
    },
    {
      "id": 2,
      "name": "Item 2",
      "description": "Second item"
    }
  ]
}
```

### 4. Use Custom Commands

```typescript
// Instead of this:
cy.intercept('GET', '/api/v1/auth/me/', { statusCode: 200, body: user })
cy.window().then((win) => {
  win.localStorage.setItem('selected_cinema_id', '1')
})

// Use this:
cy.mockAuthSession()

// Or for real authentication:
cy.login('username', 'password')
```

### 5. Test Coverage Checklist

For each feature, test:

- [ ] **List View**
  - Display all items
  - Empty state
  - Loading state
  - Error state

- [ ] **Create**
  - Open form
  - Validate required fields
  - Submit successfully
  - Handle errors
  - Close form

- [ ] **Edit**
  - Open form with data
  - Update fields
  - Submit successfully
  - Handle errors

- [ ] **Delete**
  - Confirmation dialog
  - Delete on confirm
  - Cancel deletion

- [ ] **Filtering** (if applicable)
  - Filter by each field
  - Clear filters
  - Filtered empty state

- [ ] **Responsive Design**
  - Mobile view (375x667)
  - Desktop view (1280x720)

---

## Debugging

### Cypress Interactive Mode

1. **Open Cypress:**
   ```bash
   npm run cypress:open
   ```

2. **Select test to debug**

3. **Use DevTools:**
   - Right-click in test runner → Inspect
   - Use `debugger` in test code
   - Add `.debug()` to commands:
     ```typescript
     cy.get('.selector').debug()
     ```

4. **Time Travel:**
   - Click on any command in the left panel
   - DOM snapshot shows at that point
   - Hover over elements to highlight

### Common Debugging Commands

```typescript
// Pause test execution
cy.pause()

// Log to console
cy.log('Debug message')

// Get and log element
cy.get('.selector').then($el => {
  console.log('Element:', $el)
})

// Take screenshot
cy.screenshot('debug-screenshot')

// Print all intercepts
cy.intercept('/api/**', (req) => {
  console.log('API Request:', req.url, req.body)
})
```

### Debugging Test Failures

1. **Check Screenshot:**
   - Screenshots saved to `cypress/screenshots/` on failure
   - Shows exact state when test failed

2. **Check Video:**
   - Videos saved to `cypress/videos/` (if enabled)
   - Shows full test execution

3. **Check Logs:**
   - Cypress logs in terminal show stack trace
   - Browser console shows application errors

4. **Network Interception:**
   ```typescript
   cy.intercept('/api/v1/endpoint/', (req) => {
     console.log('Request:', req)
     req.continue((res) => {
       console.log('Response:', res)
     })
   })
   ```

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/cypress.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  cypress-run:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: cinema_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: www_leprinceos_com/package-lock.json

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install Python dependencies
        working-directory: api_leprinceos_com
        run: |
          pip install -r requirements.txt

      - name: Install Node dependencies
        working-directory: www_leprinceos_com
        run: npm ci

      - name: Run migrations
        working-directory: api_leprinceos_com
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/cinema_test
        run: |
          python manage.py migrate

      - name: Start Django server
        working-directory: api_leprinceos_com
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/cinema_test
        run: |
          python manage.py runserver &
          sleep 5

      - name: Start Vite dev server
        working-directory: www_leprinceos_com
        run: |
          npm run dev &
          npx wait-on http://localhost:5173

      - name: Run Cypress tests
        working-directory: www_leprinceos_com
        run: npm run cypress:run

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: cypress-screenshots
          path: www_leprinceos_com/cypress/screenshots

      - name: Upload videos
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: cypress-videos
          path: www_leprinceos_com/cypress/videos
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test

e2e:
  stage: test
  image: cypress/browsers:node18.12.0-chrome106-ff106

  services:
    - postgres:15

  variables:
    POSTGRES_DB: cinema_test
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    DATABASE_URL: postgresql://postgres:postgres@postgres/cinema_test

  before_script:
    - cd api_leprinceos_com
    - pip install -r requirements.txt
    - python manage.py migrate
    - python manage.py runserver &
    - cd ../www_leprinceos_com
    - npm ci
    - npm run dev &
    - npx wait-on http://localhost:5173

  script:
    - npm run cypress:run

  artifacts:
    when: on_failure
    paths:
      - cypress/screenshots/
      - cypress/videos/
    expire_in: 1 week
```

---

## Troubleshooting

### Test Timeouts

**Problem:** Tests timeout waiting for elements

**Solutions:**
```typescript
// Increase timeout for specific command
cy.get('.slow-element', { timeout: 20000 })

// Increase globally in cypress.config.ts
export default defineConfig({
  e2e: {
    defaultCommandTimeout: 15000,
  },
})

// Wait for specific condition
cy.get('.element').should('be.visible')
cy.wait('@apiCall')
```

### Element Not Found

**Problem:** `cy.get()` can't find element

**Solutions:**
```typescript
// Check selector is correct
cy.get('[data-cy="my-element"]')

// Wait for element to appear
cy.contains('Text').should('be.visible')

// Check if element is in iframe
cy.iframe().find('.element')

// Check timing - may need to wait for API
cy.wait('@apiCall')
cy.get('.element')
```

### Flaky Tests

**Problem:** Tests pass sometimes, fail others

**Solutions:**
```typescript
// Don't use arbitrary waits
cy.wait(1000) // ❌ BAD

// Use proper waits
cy.wait('@apiCall') // ✅ GOOD
cy.get('.element').should('be.visible') // ✅ GOOD

// Add retry logic in cypress.config.ts
export default defineConfig({
  e2e: {
    retries: {
      runMode: 2,
      openMode: 0,
    },
  },
})
```

### API Interception Not Working

**Problem:** `cy.wait('@alias')` fails

**Solutions:**
```typescript
// Check alias is defined before use
cy.intercept('GET', '/api/endpoint/').as('myAlias')
cy.visit('/page')
cy.wait('@myAlias') // ✅ Defined before visit

// Check URL pattern matches
cy.intercept('GET', '/api/endpoint/*') // Matches /api/endpoint/123
cy.intercept('GET', '/api/endpoint/**') // Matches /api/endpoint/123/sub

// Use regex for flexible matching
cy.intercept('GET', /\/api\/endpoint\/\d+/)
```

### Cypress Won't Start

**Problem:** Cypress fails to open

**Solutions:**
```bash
# Clear Cypress cache
npx cypress cache clear
npx cypress install

# Check for conflicting processes
lsof -i :5173  # Check if dev server is running
lsof -i :8000  # Check if backend is running

# Run with debug logs
DEBUG=cypress:* npm run cypress:open
```

### Tests Pass Locally, Fail in CI

**Problem:** CI environment differences

**Solutions:**
```yaml
# Ensure same Node version
- uses: actions/setup-node@v3
  with:
    node-version: '18'  # Match local version

# Install exact dependencies
- run: npm ci  # Not npm install

# Wait for services
- run: npx wait-on http://localhost:5173

# Set environment variables
env:
  NODE_ENV: test
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Best Practices

### ✅ DO

- Use `data-cy` attributes for selectors
- Wait for API calls with `cy.wait('@alias')`
- Test user behavior, not implementation
- Keep tests independent and isolated
- Use fixtures for mock data
- Test error states and edge cases
- Write descriptive test names

### ❌ DON'T

- Use arbitrary `cy.wait(milliseconds)`
- Rely on brittle CSS selectors
- Test multiple scenarios in one test
- Share state between tests
- Hard-code data in tests
- Only test happy paths
- Write vague test names like "it works"

---

## Additional Resources

- **Cypress Documentation:** https://docs.cypress.io
- **Best Practices:** https://docs.cypress.io/guides/references/best-practices
- **API Reference:** https://docs.cypress.io/api/table-of-contents
- **Cypress Discord:** https://discord.gg/cypress
- **Stack Overflow:** Tag `[cypress]`

---

## Test Suite Metrics

- **Total Test Files:** 10
- **Total Tests:** 180+
- **Custom Commands:** 6
- **Fixtures:** 8
- **Coverage:** CRUD ops, validation, responsive design
- **Pass Rate:** 100% (with mocked responses)
- **Avg Test Duration:** 2-3 seconds
- **Total Suite Runtime:** 5-8 minutes

---

## Quick Reference

```bash
# Run all tests
npm run cypress:run

# Open interactive mode
npm run cypress:open

# Run specific file
npx cypress run --spec "cypress/e2e/showtimes.cy.ts"

# Run with specific browser
npm run cypress:run:chrome

# Generate coverage report
npm run test:coverage

# Run component tests
npm run test

# Clean and reinstall Cypress
npx cypress cache clear
npx cypress install
```

---

**Last Updated:** 2026-01-31
**Maintained By:** Development Team
**Questions?** See `cypress/README.md` for detailed documentation
