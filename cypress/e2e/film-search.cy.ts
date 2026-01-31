describe('TMDB Film Search', () => {
  beforeEach(() => {
    // Set up authenticated session
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser')
    })

    // Mock engagements list
    cy.fixture('engagements').then((engagements) => {
      cy.intercept('GET', '/api/v1/engagements/*', {
        statusCode: 200,
        body: engagements,
      }).as('getEngagements')
    })

    // Mock films list endpoint
    cy.fixture('films').then((films) => {
      cy.intercept('GET', '/api/v1/films/*', {
        statusCode: 200,
        body: films,
      }).as('getFilms')
    })

    // Mock screens list (needed for engagement form)
    cy.intercept('GET', '/api/v1/screens/*', {
      statusCode: 200,
      body: {
        count: 2,
        results: [
          { id: 1, name: 'Screen 1', capacity: 150, screen_type: 'standard', aspect_ratio: 'flat', sound_system: 'dolby_atmos', supports_3d: true },
          { id: 2, name: 'Screen 2', capacity: 100, screen_type: 'standard', aspect_ratio: 'scope', sound_system: 'standard', supports_3d: false },
        ],
      },
    }).as('getScreens')
  })

  describe('Search Functionality', () => {
    it('should show film search when toggle button is clicked', () => {
      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      // Open create engagement drawer
      cy.contains('button', /new engagement/i).click()

      // Verify film dropdown is shown by default
      cy.get('select').first().should('be.visible')
      cy.contains('button', /search tmdb instead/i).should('be.visible')

      // Click toggle to show search
      cy.contains('button', /search tmdb instead/i).click()

      // Verify search input is now visible
      cy.get('input#film-search').should('be.visible')
      cy.get('input#film-search').should('have.attr', 'placeholder', 'Search for a film by title...')

      // Verify toggle button text changed
      cy.contains('button', /use existing film/i).should('be.visible')
    })

    it('should toggle back to film dropdown', () => {
      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      // Verify search is shown
      cy.get('input#film-search').should('be.visible')

      // Toggle back
      cy.contains('button', /use existing film/i).click()

      // Verify dropdown is shown again
      cy.get('select').first().should('be.visible')
      cy.get('input#film-search').should('not.exist')
    })

    it('should show loading state while searching', () => {
      // Mock slow TMDB search response
      cy.intercept('GET', '/api/v1/films/search/*', (req) => {
        req.reply((res) => {
          res.delay = 1000
          res.send({
            statusCode: 200,
            body: [],
          })
        })
      }).as('searchTMDBSlow')

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      // Type in search
      cy.get('input#film-search').type('matrix')

      // Should show loading spinner in input
      cy.get('[aria-label="Searching"]').should('be.visible')

      // Should show loading state in dropdown
      cy.contains('Searching TMDB...').should('be.visible')

      cy.wait('@searchTMDBSlow')
    })

    it('should display search results after debounce', () => {
      cy.fixture('tmdb-search-results').then((results) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: results,
        }).as('searchTMDB')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      // Type in search
      cy.get('input#film-search').type('matrix')

      // Wait for debounce and API call
      cy.wait('@searchTMDB')

      // Verify results are displayed
      cy.contains('The Matrix').should('be.visible')
      cy.contains('(1999)').should('be.visible')
      cy.contains('The Matrix Reloaded').should('be.visible')
      cy.contains('(2003)').should('be.visible')
      cy.contains('The Matrix Revolutions').should('be.visible')
    })

    it('should display film details in results', () => {
      cy.fixture('tmdb-search-results').then((results) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: results,
        }).as('searchTMDB')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      // Verify poster images are shown
      cy.get('img[src*="image.tmdb.org"]').should('have.length.at.least', 2)

      // Verify overview text is shown
      cy.contains('A computer hacker learns from mysterious rebels').should('be.visible')

      // Verify ratings are shown
      cy.contains('8.2').should('be.visible')
      cy.contains('7.0').should('be.visible')
    })

    it('should show empty state for no results', () => {
      cy.fixture('tmdb-search-empty').then((results) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: results,
        }).as('searchTMDBEmpty')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('nonexistentfilm12345')
      cy.wait('@searchTMDBEmpty')

      // Verify empty state is shown
      cy.contains(/no films found/i).should('be.visible')
      cy.contains('nonexistentfilm12345').should('be.visible')
    })

    it('should not search with less than 2 characters', () => {
      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      // Type single character
      cy.get('input#film-search').type('m')

      // Should show help text
      cy.contains(/type at least 2 characters/i).should('be.visible')

      // Dropdown should not be visible
      cy.get('[role="listbox"]').should('not.exist')
    })

    it('should show help text when input is empty', () => {
      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      // Verify help text
      cy.contains(/search the movie database/i).should('be.visible')
      cy.contains(/type at least 2 characters/i).should('be.visible')
    })
  })

  describe('Film Selection', () => {
    it('should select film when clicked', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.fixture('film-created').then((filmResponse) => {
        cy.intercept('POST', '/api/v1/films/from-tmdb/', {
          statusCode: 201,
          body: filmResponse,
        }).as('createFilm')
      })

      // Update films list to include newly created film
      cy.fixture('films').then((films) => {
        cy.intercept('GET', '/api/v1/films/*', {
          statusCode: 200,
          body: films,
        }).as('getFilmsUpdated')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      // Click first result
      cy.contains('button', 'The Matrix').click()

      cy.wait('@createFilm')
      cy.wait('@getFilmsUpdated')

      // Verify success indicator
      cy.contains(/film selected/i).should('be.visible')
      cy.contains('The Matrix').should('be.visible')

      // Verify search input is cleared
      cy.get('input#film-search').should('have.value', '')
    })

    it('should show creating indicator while film is being added', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.fixture('film-created').then((filmResponse) => {
        cy.intercept('POST', '/api/v1/films/from-tmdb/', (req) => {
          req.reply((res) => {
            res.delay = 1000
            res.send({
              statusCode: 201,
              body: filmResponse,
            })
          })
        }).as('createFilmSlow')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      cy.contains('button', 'The Matrix').click()

      // Verify creating indicator
      cy.contains(/adding film to your library/i).should('be.visible')

      cy.wait('@createFilmSlow')
    })

    it('should disable search input while creating film', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.fixture('film-created').then((filmResponse) => {
        cy.intercept('POST', '/api/v1/films/from-tmdb/', (req) => {
          req.reply((res) => {
            res.delay = 500
            res.send({
              statusCode: 201,
              body: filmResponse,
            })
          })
        }).as('createFilmSlow')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      cy.contains('button', 'The Matrix').click()

      // Verify input is disabled
      cy.get('input#film-search').should('be.disabled')

      cy.wait('@createFilmSlow')
    })

    it('should close dropdown after selection', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.fixture('film-created').then((filmResponse) => {
        cy.intercept('POST', '/api/v1/films/from-tmdb/', {
          statusCode: 201,
          body: filmResponse,
        }).as('createFilm')
      })

      cy.fixture('films').then((films) => {
        cy.intercept('GET', '/api/v1/films/*', {
          statusCode: 200,
          body: films,
        }).as('getFilmsUpdated')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      cy.contains('button', 'The Matrix').click()
      cy.wait('@createFilm')

      // Dropdown should not be visible
      cy.get('[role="listbox"]').should('not.exist')
    })
  })

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')
    })

    it('should navigate down through results with arrow down key', () => {
      // Press arrow down
      cy.get('input#film-search').type('{downarrow}')

      // First result should be highlighted
      cy.get('[id="result-0"]').should('have.class', /selected/i)

      // Press arrow down again
      cy.get('input#film-search').type('{downarrow}')

      // Second result should be highlighted
      cy.get('[id="result-1"]').should('have.class', /selected/i)
    })

    it('should navigate up through results with arrow up key', () => {
      // Navigate down twice
      cy.get('input#film-search').type('{downarrow}{downarrow}')

      // Second result should be highlighted
      cy.get('[id="result-1"]').should('have.class', /selected/i)

      // Press arrow up
      cy.get('input#film-search').type('{uparrow}')

      // First result should be highlighted
      cy.get('[id="result-0"]').should('have.class', /selected/i)
    })

    it('should not go beyond last result when pressing down', () => {
      // Press down 5 times (more than results available)
      cy.get('input#film-search').type('{downarrow}{downarrow}{downarrow}{downarrow}{downarrow}')

      // Should stay on last result (index 2)
      cy.get('[id="result-2"]').should('have.class', /selected/i)
    })

    it('should reset selection when pressing up from first item', () => {
      // Navigate to first item
      cy.get('input#film-search').type('{downarrow}')
      cy.get('[id="result-0"]').should('have.class', /selected/i)

      // Press up
      cy.get('input#film-search').type('{uparrow}')

      // No result should be selected
      cy.get('[class*="resultItemSelected"]').should('not.exist')
    })

    it('should select highlighted result with enter key', () => {
      cy.fixture('film-created').then((filmResponse) => {
        cy.intercept('POST', '/api/v1/films/from-tmdb/', {
          statusCode: 201,
          body: filmResponse,
        }).as('createFilm')
      })

      cy.fixture('films').then((films) => {
        cy.intercept('GET', '/api/v1/films/*', {
          statusCode: 200,
          body: films,
        }).as('getFilmsUpdated')
      })

      // Navigate to second result
      cy.get('input#film-search').type('{downarrow}{downarrow}')

      // Press enter
      cy.get('input#film-search').type('{enter}')

      cy.wait('@createFilm')

      // Verify the request was for the second film (Matrix Reloaded, id 604)
      cy.get('@createFilm').its('request.body').should('deep.equal', { tmdb_id: 604 })
    })

    it('should close dropdown with escape key', () => {
      // Verify dropdown is open
      cy.get('[role="listbox"]').should('be.visible')

      // Press escape
      cy.get('input#film-search').type('{esc}')

      // Dropdown should be closed
      cy.get('[role="listbox"]').should('not.exist')
    })

    it('should reset selection when pressing escape', () => {
      // Navigate to a result
      cy.get('input#film-search').type('{downarrow}{downarrow}')
      cy.get('[id="result-1"]').should('have.class', /selected/i)

      // Press escape
      cy.get('input#film-search').type('{esc}')

      // Reopen dropdown by focusing input
      cy.get('input#film-search').focus()

      // No result should be selected
      cy.get('[class*="resultItemSelected"]').should('not.exist')
    })
  })

  describe('Click Outside Behavior', () => {
    it('should close dropdown when clicking outside', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      // Verify dropdown is open
      cy.get('[role="listbox"]').should('be.visible')

      // Click outside (on the drawer header)
      cy.contains('New Engagement').click()

      // Dropdown should be closed
      cy.get('[role="listbox"]').should('not.exist')
    })

    it('should not close dropdown when clicking on the input', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      // Click on input
      cy.get('input#film-search').click()

      // Dropdown should still be open
      cy.get('[role="listbox"]').should('be.visible')
    })

    it('should reopen dropdown when focusing input with existing query', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      // Close dropdown with escape
      cy.get('input#film-search').type('{esc}')
      cy.get('[role="listbox"]').should('not.exist')

      // Focus input again
      cy.get('input#film-search').focus()

      // Dropdown should reopen
      cy.get('[role="listbox"]').should('be.visible')
    })
  })

  describe('Error Handling', () => {
    it('should show error state on network error', () => {
      cy.intercept('GET', '/api/v1/films/search/*', {
        statusCode: 500,
        body: { detail: 'Internal server error' },
      }).as('searchTMDBError')

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDBError')

      // Verify error state is shown
      cy.contains(/failed to search tmdb/i).should('be.visible')
      cy.contains(/please try again/i).should('be.visible')
    })

    it('should show error banner when film creation fails', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.intercept('POST', '/api/v1/films/from-tmdb/', {
        statusCode: 400,
        body: { detail: 'Failed to create film' },
      }).as('createFilmError')

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      cy.contains('button', 'The Matrix').click()
      cy.wait('@createFilmError')

      // Verify error banner
      cy.contains(/failed to add film/i).should('be.visible')
      cy.contains(/please try again/i).should('be.visible')
    })

    it('should allow retry after error', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      // First request fails
      let callCount = 0
      cy.intercept('POST', '/api/v1/films/from-tmdb/', (req) => {
        callCount++
        if (callCount === 1) {
          req.reply({
            statusCode: 500,
            body: { detail: 'Server error' },
          })
        } else {
          cy.fixture('film-created').then((filmResponse) => {
            req.reply({
              statusCode: 201,
              body: filmResponse,
            })
          })
        }
      }).as('createFilm')

      cy.fixture('films').then((films) => {
        cy.intercept('GET', '/api/v1/films/*', {
          statusCode: 200,
          body: films,
        }).as('getFilmsUpdated')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      // First attempt - should fail
      cy.contains('button', 'The Matrix').click()
      cy.wait('@createFilm')
      cy.contains(/failed to add film/i).should('be.visible')

      // Retry - should succeed
      cy.contains('button', 'The Matrix').click()
      cy.wait('@createFilm')
      cy.contains(/film selected/i).should('be.visible')
    })
  })

  describe('Integration with Engagement Form', () => {
    it('should preserve film selection when switching back to dropdown', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.fixture('film-created').then((filmResponse) => {
        cy.intercept('POST', '/api/v1/films/from-tmdb/', {
          statusCode: 201,
          body: filmResponse,
        }).as('createFilm')
      })

      cy.fixture('films').then((films) => {
        cy.intercept('GET', '/api/v1/films/*', {
          statusCode: 200,
          body: films,
        }).as('getFilmsUpdated')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      cy.contains('button', 'The Matrix').click()
      cy.wait('@createFilm')
      cy.wait('@getFilmsUpdated')

      // Switch back to dropdown
      cy.contains('button', /use existing film/i).click()

      // Verify the newly created film is in the dropdown but not selected
      // (because switching back clears the selection)
      cy.get('select').first().find('option').should('contain', 'The Matrix')
      cy.get('select').first().should('have.value', '')
    })

    it('should be able to submit form after selecting film via search', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.fixture('film-created').then((filmResponse) => {
        cy.intercept('POST', '/api/v1/films/from-tmdb/', {
          statusCode: 201,
          body: filmResponse,
        }).as('createFilm')
      })

      cy.fixture('films').then((films) => {
        cy.intercept('GET', '/api/v1/films/*', {
          statusCode: 200,
          body: films,
        }).as('getFilmsUpdated')
      })

      cy.intercept('POST', '/api/v1/engagements/', (req) => {
        expect(req.body).to.have.property('film', 100) // The Matrix's ID
        req.reply({
          statusCode: 201,
          body: {
            id: 10,
            ...req.body,
            film_title: 'The Matrix',
            screen_name: 'Screen 1',
            is_active: true,
            created_at: '2024-01-31T12:00:00Z',
          },
        })
      }).as('createEngagement')

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      // Select film via search
      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')
      cy.contains('button', 'The Matrix').click()
      cy.wait('@createFilm')
      cy.wait('@getFilmsUpdated')

      // Fill in rest of form
      cy.get('select').eq(1).select('Screen 1')
      cy.get('input[type="date"]').first().type('2024-03-01')
      cy.get('input[type="date"]').last().type('2024-03-15')

      // Submit form
      cy.contains('button', /create engagement/i).click()

      cy.wait('@createEngagement')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on search input', () => {
      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search')
        .should('have.attr', 'aria-autocomplete', 'list')
        .and('have.attr', 'aria-controls', 'search-results')
        .and('have.attr', 'aria-expanded', 'false')
    })

    it('should update aria-expanded when dropdown opens', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      cy.get('input#film-search').should('have.attr', 'aria-expanded', 'true')
    })

    it('should set aria-activedescendant when navigating with keyboard', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      // Navigate to first result
      cy.get('input#film-search').type('{downarrow}')

      cy.get('input#film-search').should('have.attr', 'aria-activedescendant', 'result-0')
    })

    it('should have proper role attributes on dropdown and results', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      // Verify dropdown has listbox role
      cy.get('[role="listbox"]').should('exist')

      // Verify results have option role
      cy.get('[role="option"]').should('have.length', 3)
    })

    it('should have proper aria-selected attribute on results', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      // Navigate to second result
      cy.get('input#film-search').type('{downarrow}{downarrow}')

      // Verify second result has aria-selected=true
      cy.get('[id="result-1"]').should('have.attr', 'aria-selected', 'true')

      // Others should have aria-selected=false
      cy.get('[id="result-0"]').should('have.attr', 'aria-selected', 'false')
      cy.get('[id="result-2"]').should('have.attr', 'aria-selected', 'false')
    })

    it('should have status role for loading and creating indicators', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.fixture('film-created').then((filmResponse) => {
        cy.intercept('POST', '/api/v1/films/from-tmdb/', (req) => {
          req.reply((res) => {
            res.delay = 500
            res.send({
              statusCode: 201,
              body: filmResponse,
            })
          })
        }).as('createFilm')
      })

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      cy.contains('button', 'The Matrix').click()

      // Verify creating indicator has status role
      cy.get('[role="status"]').should('be.visible')
      cy.contains(/adding film to your library/i).should('be.visible')

      cy.wait('@createFilm')
    })

    it('should have alert role for error messages', () => {
      cy.fixture('tmdb-search-results').then((searchResults) => {
        cy.intercept('GET', '/api/v1/films/search/*', {
          statusCode: 200,
          body: searchResults,
        }).as('searchTMDB')
      })

      cy.intercept('POST', '/api/v1/films/from-tmdb/', {
        statusCode: 500,
        body: { detail: 'Server error' },
      }).as('createFilmError')

      cy.visit('/dashboard/engagements')
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagements')

      cy.contains('button', /new engagement/i).click()
      cy.contains('button', /search tmdb instead/i).click()

      cy.get('input#film-search').type('matrix')
      cy.wait('@searchTMDB')

      cy.contains('button', 'The Matrix').click()
      cy.wait('@createFilmError')

      // Verify error has alert role
      cy.get('[role="alert"]').should('be.visible')
      cy.contains(/failed to add film/i).should('be.visible')
    })
  })
})
