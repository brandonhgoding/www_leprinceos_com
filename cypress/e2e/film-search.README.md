# TMDB Film Search E2E Tests

Comprehensive Cypress end-to-end tests for the TMDB film search feature in the React dashboard.

## Test Coverage

### 1. Search Functionality
- **Toggle between search and dropdown**: Verify users can switch between the existing film dropdown and TMDB search
- **Loading states**: Ensure loading indicators appear during API calls
- **Debounced search**: Verify search waits for user to finish typing (300ms debounce)
- **Results display**: Check that film titles, years, overviews, posters, and ratings render correctly
- **Empty state**: Verify appropriate messaging when no results are found
- **Minimum query length**: Ensure search doesn't fire with less than 2 characters
- **Help text**: Verify instructional text appears when input is empty

### 2. Film Selection
- **Click selection**: Users can select films by clicking on results
- **Success indicator**: Verify confirmation message appears after selection
- **Creating indicator**: Loading state shown while film is being added to library
- **Disabled state**: Input and buttons disabled during film creation
- **Dropdown closure**: Results dropdown closes after selection
- **Input clearing**: Search input clears after successful selection

### 3. Keyboard Navigation
- **Arrow down**: Navigate forward through results
- **Arrow up**: Navigate backward through results
- **Boundary handling**: Cannot navigate beyond first or last result
- **Enter key**: Select the currently highlighted result
- **Escape key**: Close dropdown and reset selection
- **Selection reset**: Properly manages selection state across interactions

### 4. Click Outside Behavior
- **Close on outside click**: Dropdown closes when clicking elsewhere
- **Stay open on input click**: Clicking the input keeps dropdown open
- **Reopen on focus**: Focusing input with existing query reopens dropdown

### 5. Error Handling
- **Search errors**: Network failures show appropriate error messaging
- **Creation errors**: Film creation failures display error banner
- **Retry capability**: Users can retry after errors
- **Graceful degradation**: Errors don't break the UI or prevent further interaction

### 6. Integration with Engagement Form
- **Form submission**: Films selected via search can be used to create engagements
- **State preservation**: Film selection persists correctly in form state
- **Dropdown refresh**: Newly created films appear in the existing film dropdown after creation

### 7. Accessibility
- **ARIA attributes**:
  - `aria-autocomplete="list"` on search input
  - `aria-controls` links input to results
  - `aria-expanded` reflects dropdown state
  - `aria-activedescendant` tracks keyboard navigation
- **Roles**:
  - `role="listbox"` on dropdown
  - `role="option"` on each result
  - `role="status"` on loading indicators
  - `role="alert"` on error messages
- **aria-selected**: Properly tracks selected result during keyboard navigation
- **Semantic HTML**: All interactive elements are buttons with proper labels

## Running the Tests

### Run all film search tests
```bash
npm run cypress:open
```
Then select `film-search.cy.ts` from the test list.

### Run in headless mode
```bash
npx cypress run --spec "cypress/e2e/film-search.cy.ts"
```

### Run specific test suite
```bash
npx cypress run --spec "cypress/e2e/film-search.cy.ts" --grep "Search Functionality"
```

## Fixtures Used

All fixtures are located in `cypress/fixtures/`:

- **tmdb-search-results.json**: Mock TMDB search results (The Matrix trilogy)
- **tmdb-search-empty.json**: Empty search results array
- **film-created.json**: Response when creating a film from TMDB
- **films.json**: List of existing films in the cinema's library
- **user.json**: Authenticated user data
- **engagements.json**: List of film engagements (from existing tests)

## API Endpoints Mocked

```typescript
// TMDB search
GET /api/v1/films/search/?q={query}
Response: TMDBSearchResult[]

// Create film from TMDB
POST /api/v1/films/from-tmdb/
Body: { tmdb_id: number }
Response: { film: Film, created: boolean }

// List existing films
GET /api/v1/films/
Response: PaginatedResponse<Film>

// Authentication
GET /api/v1/auth/me/
Response: User

// Engagements (for page context)
GET /api/v1/engagements/
Response: PaginatedResponse<Engagement>

// Screens (for form context)
GET /api/v1/screens/
Response: PaginatedResponse<Screen>
```

## Test Patterns

### Standard Setup
Every test follows this pattern:
1. Mock authentication (`/api/v1/auth/me/`)
2. Mock page data (engagements, screens)
3. Visit the engagements page
4. Open the create engagement drawer
5. Toggle to film search mode
6. Perform test-specific actions

### Waiting for Network
Tests use `cy.wait('@aliasName')` to ensure API calls complete before assertions:
```typescript
cy.intercept('GET', '/api/v1/films/search/*', { ... }).as('searchTMDB')
cy.get('input#film-search').type('matrix')
cy.wait('@searchTMDB') // Wait for API call
cy.contains('The Matrix').should('be.visible') // Then assert
```

### Testing Debounce
For debounce testing, we either:
- Use delayed responses to verify loading states persist
- Type quickly and verify only one API call is made
- Check that dropdown doesn't open with < 2 characters

### Keyboard Navigation Testing
Arrow keys are sent as special strings:
```typescript
cy.get('input#film-search').type('{downarrow}') // Arrow down
cy.get('input#film-search').type('{uparrow}')   // Arrow up
cy.get('input#film-search').type('{enter}')     // Enter key
cy.get('input#film-search').type('{esc}')       // Escape key
```

### Accessibility Assertions
```typescript
// Check for ARIA attributes
cy.get('input#film-search')
  .should('have.attr', 'aria-autocomplete', 'list')
  .and('have.attr', 'aria-expanded', 'true')

// Check for roles
cy.get('[role="listbox"]').should('exist')
cy.get('[role="option"]').should('have.length', 3)
cy.get('[role="status"]').should('be.visible')
```

## Adding New Tests

To add a new test:

1. **Identify the scenario**: What user behavior are you testing?
2. **Set up mocks**: What API responses does this scenario need?
3. **Follow the navigation path**:
   - Visit page → Open drawer → Toggle to search → Perform action
4. **Use proper selectors**:
   - Prefer `data-testid` attributes (if added)
   - Fall back to semantic selectors (`role`, `aria-label`)
   - Avoid fragile selectors (classes, positions)
5. **Wait for async operations**: Always `cy.wait()` for API calls
6. **Assert meaningfully**: Test both visual state AND underlying data

## Known Limitations

- **Image loading**: Tests don't verify actual image rendering, only `src` attributes
- **Timing sensitivity**: Some tests with delays may be flaky on slow machines
- **Real TMDB API**: Tests use fixtures, not the actual TMDB API

## Future Enhancements

Potential test additions:
- [ ] Test with very long film titles (truncation)
- [ ] Test with films that have no poster
- [ ] Test with films that have no release date
- [ ] Test rapid typing and debounce cancellation
- [ ] Test selection of film that already exists in library
- [ ] Test network timeout scenarios
- [ ] Test with screen reader emulation
- [ ] Performance testing (large result sets)
