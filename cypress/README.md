# Cypress E2E Testing for LeprinceOS Dashboard

This directory contains end-to-end tests for the React dashboard application using Cypress.

## Table of Contents

- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Custom Commands](#custom-commands)
- [Fixtures](#fixtures)
- [Best Practices](#best-practices)

## Getting Started

### Prerequisites

- Node.js and npm installed
- Django backend running on `http://localhost:8000`
- React dev server running on `http://localhost:5173`

### Installation

Cypress is already installed as a dev dependency. If you need to reinstall:

```bash
npm install --save-dev cypress
```

## Running Tests

### Interactive Mode (Cypress UI)

Open Cypress Test Runner for interactive development:

```bash
npm run cypress:open
# or
npm run e2e:open
```

This opens the Cypress UI where you can:
- Select and run individual test files
- See tests execute in real-time
- Use time-travel debugging
- Take screenshots and videos

### Headless Mode (CI/CD)

Run all tests in headless mode:

```bash
npm run cypress:run
# or
npm run e2e
```

Run tests in specific browsers:

```bash
npm run cypress:run:chrome
npm run cypress:run:firefox
```

### Before Running Tests

1. **Start the Django backend:**
   ```bash
   cd /path/to/api_leprinceos_com
   python manage.py runserver
   ```

2. **Start the React dev server:**
   ```bash
   npm run dev
   ```

3. **Run Cypress tests:**
   ```bash
   npm run cypress:open
   ```

## Test Structure

```
cypress/
├── e2e/                      # E2E test specs
│   ├── auth.cy.ts           # Authentication tests
│   ├── navigation.cy.ts     # Navigation & routing tests
│   ├── engagements.cy.ts    # Engagements CRUD tests
│   ├── concessions.cy.ts    # Concessions CRUD tests
│   ├── tickets.cy.ts        # Tickets management tests
│   └── modifiers.cy.ts      # Modifiers management tests
├── fixtures/                # Test data
│   ├── user.json           # Mock user data
│   ├── engagements.json    # Mock engagements
│   ├── concessions.json    # Mock concessions
│   ├── tickets.json        # Mock tickets
│   ├── modifiers.json      # Mock modifiers
│   └── screens.json        # Mock screens
├── support/                # Support files
│   ├── commands.ts         # Custom commands
│   ├── e2e.ts             # Global configuration
│   └── index.d.ts         # TypeScript definitions
└── README.md              # This file
```

## Writing Tests

### Test File Naming Convention

- Use `.cy.ts` or `.cy.tsx` extension
- Name files after the feature being tested
- Place in `cypress/e2e/` directory

Example: `cypress/e2e/engagements.cy.ts`

### Basic Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Set up auth session
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser')
    })
  })

  it('should perform expected behavior', () => {
    cy.visit('/dashboard/feature')
    cy.wait('@getCurrentUser')

    // Test interactions
    cy.contains('button', /create/i).click()
    cy.get('input[name="name"]').type('Test Name')
    cy.contains('button', /save/i).click()

    // Assertions
    cy.contains(/success/i).should('be.visible')
  })
})
```

### Selector Priority

Use selectors in this order of preference:

1. **Role-based queries** (most resilient):
   ```typescript
   cy.get('[role="button"]')
   cy.contains('button', /submit/i)
   ```

2. **Data attributes** (test-specific):
   ```typescript
   cy.dataCy('submit-button')  // Custom command
   cy.get('[data-cy="submit-button"]')
   ```

3. **Form attributes**:
   ```typescript
   cy.get('input[name="email"]')
   cy.get('textarea[name="description"]')
   ```

4. **Text content** (for non-interactive elements):
   ```typescript
   cy.contains('Dashboard')
   cy.contains(/no items found/i)
   ```

5. **CSS selectors** (last resort):
   ```typescript
   cy.get('.submit-button')  // Avoid - classes change frequently
   ```

## Custom Commands

Located in `cypress/support/commands.ts`. See `cypress/support/index.d.ts` for TypeScript definitions.

### Available Commands

#### `cy.login(username, password)`

Authenticates via API and maintains session:

```typescript
cy.login('admin', 'password123')
```

#### `cy.logout()`

Logs out the current user:

```typescript
cy.logout()
```

#### `cy.mockAuthSession(userData?)`

Sets up mock authentication without hitting the backend:

```typescript
cy.mockAuthSession()  // Uses default user data
cy.mockAuthSession({ username: 'custom-user' })  // Custom data
```

#### `cy.selectCinema(cinemaId)`

Switches the active cinema:

```typescript
cy.selectCinema(2)
```

#### `cy.dataCy(value)`

Shorthand for getting elements by `data-cy` attribute:

```typescript
cy.dataCy('submit-button').click()
// Equivalent to: cy.get('[data-cy="submit-button"]').click()
```

#### `cy.waitForApi(alias, expectedStatus?)`

Waits for API call and validates response status:

```typescript
cy.waitForApi('@getEngagements', 200)
```

#### Viewport Commands

```typescript
cy.setMobileViewport()   // 375x667
cy.setTabletViewport()   // 768x1024
cy.setDesktopViewport()  // 1280x720
```

## Fixtures

Test data is stored in `cypress/fixtures/` as JSON files.

### Using Fixtures

Load fixture data in tests:

```typescript
cy.fixture('user').then((user) => {
  cy.intercept('GET', '/api/v1/auth/me/', {
    statusCode: 200,
    body: user,
  }).as('getCurrentUser')
})
```

### Creating New Fixtures

1. Create a JSON file in `cypress/fixtures/`
2. Match the structure of your API responses
3. Use realistic data that represents various states

Example fixture (`cypress/fixtures/tickets.json`):

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Adult",
      "price": "12.00",
      "is_active": true,
      "description": "Standard adult admission",
      "cinema": 1
    }
  ]
}
```

## Best Practices

### 1. Don't Use Arbitrary Waits

❌ **Bad:**
```typescript
cy.wait(3000)  // Fragile and slow
```

✅ **Good:**
```typescript
cy.intercept('GET', '/api/v1/data').as('getData')
cy.wait('@getData')
```

### 2. Use Network Interception

Mock API calls for consistent, fast tests:

```typescript
cy.intercept('POST', '/api/v1/items/', {
  statusCode: 201,
  body: { id: 1, name: 'New Item' },
}).as('createItem')

// Perform action
cy.contains('button', /create/i).click()

// Wait and assert
cy.wait('@createItem')
```

### 3. Test User Behavior, Not Implementation

❌ **Bad:**
```typescript
it('should set state variable', () => {
  // Testing implementation details
})
```

✅ **Good:**
```typescript
it('should display error message when form is invalid', () => {
  // Testing user-visible behavior
})
```

### 4. Keep Tests Independent

Each test should be able to run in isolation:

```typescript
beforeEach(() => {
  // Reset state before each test
  cy.clearAllCookies()
  cy.clearLocalStorage()

  // Set up auth
  cy.mockAuthSession()
})
```

### 5. Use Descriptive Test Names

❌ **Bad:**
```typescript
it('works', () => { ... })
```

✅ **Good:**
```typescript
it('should create new engagement with valid data', () => { ... })
```

### 6. Group Related Tests

```typescript
describe('Engagements', () => {
  describe('Create Flow', () => {
    it('should open create form')
    it('should validate required fields')
    it('should create item with valid data')
  })

  describe('Edit Flow', () => {
    it('should populate form with existing data')
    it('should save changes')
  })
})
```

### 7. Handle Loading States

```typescript
// Wait for data to load
cy.intercept('GET', '/api/v1/items/').as('getItems')
cy.visit('/items')
cy.wait('@getItems')

// Now you can safely interact with the UI
cy.contains('Item 1').should('be.visible')
```

### 8. Test Error States

```typescript
it('should display error when API fails', () => {
  cy.intercept('GET', '/api/v1/items/', {
    statusCode: 500,
    body: { detail: 'Server error' },
  }).as('getItemsError')

  cy.visit('/items')
  cy.wait('@getItemsError')

  cy.contains(/error/i).should('be.visible')
})
```

### 9. Test Responsive Behavior

```typescript
it('should display mobile menu on small screens', () => {
  cy.viewport(375, 667)
  cy.visit('/dashboard')

  // Test mobile-specific UI
})

it('should display sidebar on desktop', () => {
  cy.viewport(1280, 720)
  cy.visit('/dashboard')

  // Test desktop UI
})
```

### 10. Clean Up After Tests

```typescript
after(() => {
  // Clean up test data if needed
  cy.clearAllCookies()
  cy.clearLocalStorage()
})
```

## Debugging Tests

### Time Travel

In interactive mode, click on any command to see the app state at that point.

### Screenshots

Cypress automatically takes screenshots on failures. Manual screenshots:

```typescript
cy.screenshot('custom-name')
```

### Console Logs

```typescript
cy.get('input').then(($input) => {
  console.log('Input value:', $input.val())
})
```

### Pause Execution

```typescript
cy.pause()  // Pauses test execution
```

### Debug Command

```typescript
cy.debug()  // Pauses and opens debugger
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start Django backend
        run: |
          python manage.py runserver &

      - name: Start Vite dev server
        run: |
          npm run dev &

      - name: Wait for servers
        run: |
          npx wait-on http://localhost:8000
          npx wait-on http://localhost:5173

      - name: Run Cypress tests
        run: npm run cypress:run

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```

## Troubleshooting

### Tests Timing Out

- Increase timeout in `cypress.config.ts`:
  ```typescript
  defaultCommandTimeout: 10000  // 10 seconds
  ```
- Ensure backend and frontend servers are running
- Check network intercepts are properly aliased

### Element Not Found

- Verify selector is correct
- Check if element appears after async operation
- Use `cy.wait()` for network requests
- Use `.should('be.visible')` to wait for element

### Flaky Tests

- Add proper waits for network requests
- Don't rely on timing (avoid `cy.wait(milliseconds)`)
- Ensure tests are independent
- Check for race conditions in the application

### CORS Errors

Vite dev server already proxies `/api` requests. If you see CORS errors:
- Verify Django backend is running
- Check `vite.config.ts` proxy configuration

## Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [TypeScript Support](https://docs.cypress.io/guides/tooling/typescript-support)
- [Network Requests](https://docs.cypress.io/guides/guides/network-requests)
