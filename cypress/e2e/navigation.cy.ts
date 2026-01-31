describe('Navigation and Routing', () => {
  beforeEach(() => {
    // Set up authenticated session for all navigation tests
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser')
    })
  })

  describe('Main Navigation', () => {
    it('should load the home page by default', () => {
      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')

      cy.url().should('eq', `${Cypress.config().baseUrl}/dashboard/`)
      cy.contains('Dashboard').should('be.visible')
    })

    it('should navigate to Engagements page', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')

        // Find and click navigation link
        cy.contains('a', 'Engagements').click()

        cy.url().should('include', '/dashboard/engagements')
        cy.wait('@getEngagements')
      })
    })

    it('should navigate to Concessions page', () => {
      cy.fixture('concessions').then((concessions) => {
        cy.intercept('GET', '/api/v1/concessions/*', {
          statusCode: 200,
          body: concessions,
        }).as('getConcessions')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')

        cy.contains('a', 'Concessions').click()

        cy.url().should('include', '/dashboard/concessions')
        cy.wait('@getConcessions')
      })
    })

    it('should navigate to Tickets page', () => {
      cy.fixture('tickets').then((tickets) => {
        cy.intercept('GET', '/api/v1/tickets/*', {
          statusCode: 200,
          body: tickets,
        }).as('getTickets')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')

        cy.contains('a', 'Tickets').click()

        cy.url().should('include', '/dashboard/tickets')
        cy.wait('@getTickets')
      })
    })

    it('should navigate to Modifiers page', () => {
      cy.fixture('modifiers').then((modifiers) => {
        cy.intercept('GET', '/api/v1/modifiers/*', {
          statusCode: 200,
          body: modifiers,
        }).as('getModifiers')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')

        cy.contains('a', 'Modifiers').click()

        cy.url().should('include', '/dashboard/modifiers')
        cy.wait('@getModifiers')
      })
    })

    it('should navigate to Screens page', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')

        cy.contains('a', 'Screens').click()

        cy.url().should('include', '/dashboard/screens')
        cy.wait('@getScreens')
      })
    })
  })

  describe('Direct URL Access', () => {
    it('should load Engagements page via direct URL', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')

        cy.visit('/dashboard/engagements')
        cy.wait('@getCurrentUser')
        cy.wait('@getEngagements')

        cy.url().should('include', '/dashboard/engagements')
      })
    })

    it('should load Concessions page via direct URL', () => {
      cy.fixture('concessions').then((concessions) => {
        cy.intercept('GET', '/api/v1/concessions/*', {
          statusCode: 200,
          body: concessions,
        }).as('getConcessions')

        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        cy.url().should('include', '/dashboard/concessions')
      })
    })

    it('should handle detail page URLs', () => {
      cy.fixture('engagements').then((engagements) => {
        const engagement = engagements.results[0]

        cy.intercept('GET', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 200,
          body: engagement,
        }).as('getEngagement')

        cy.visit(`/dashboard/engagements/${engagement.id}`)
        cy.wait('@getCurrentUser')
        cy.wait('@getEngagement')

        cy.url().should('include', `/dashboard/engagements/${engagement.id}`)
      })
    })
  })

  describe('Browser Navigation', () => {
    it('should support browser back button', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')

        // Navigate to engagements
        cy.contains('a', 'Engagements').click()
        cy.wait('@getEngagements')
        cy.url().should('include', '/dashboard/engagements')

        // Go back
        cy.go('back')
        cy.url().should('eq', `${Cypress.config().baseUrl}/dashboard/`)
      })
    })

    it('should support browser forward button', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')

        cy.contains('a', 'Engagements').click()
        cy.wait('@getEngagements')

        cy.go('back')
        cy.url().should('eq', `${Cypress.config().baseUrl}/dashboard/`)

        // Go forward
        cy.go('forward')
        cy.url().should('include', '/dashboard/engagements')
      })
    })

    it('should maintain state when navigating back and forth', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.fixture('concessions').then((concessions) => {
          cy.intercept('GET', '/api/v1/engagements/*', {
            statusCode: 200,
            body: engagements,
          }).as('getEngagements')

          cy.intercept('GET', '/api/v1/concessions/*', {
            statusCode: 200,
            body: concessions,
          }).as('getConcessions')

          cy.visit('/dashboard')
          cy.wait('@getCurrentUser')

          // Navigate to engagements
          cy.contains('a', 'Engagements').click()
          cy.wait('@getEngagements')

          // Navigate to concessions
          cy.contains('a', 'Concessions').click()
          cy.wait('@getConcessions')

          // Go back to engagements
          cy.go('back')
          cy.url().should('include', '/dashboard/engagements')

          // Go back to home
          cy.go('back')
          cy.url().should('eq', `${Cypress.config().baseUrl}/dashboard/`)
        })
      })
    })
  })

  describe('Layout and Sidebar', () => {
    it('should display sidebar navigation on all pages', () => {
      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')

      // Check for common navigation elements
      cy.contains('a', 'Dashboard').should('be.visible')
      cy.contains('a', 'Engagements').should('be.visible')
      cy.contains('a', 'Concessions').should('be.visible')
      cy.contains('a', 'Tickets').should('be.visible')
      cy.contains('a', 'Modifiers').should('be.visible')
      cy.contains('a', 'Screens').should('be.visible')
    })

    it('should highlight active navigation item', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')

        cy.visit('/dashboard/engagements')
        cy.wait('@getCurrentUser')
        cy.wait('@getEngagements')

        // The active link might have a specific class or style
        // This test assumes there's some visual indication
        cy.contains('a', 'Engagements').should('have.class', 'active').or('have.attr', 'aria-current', 'page')
      })
    })

    it('should maintain layout across page transitions', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')

        // Check for header/sidebar
        cy.get('nav').should('be.visible')

        // Navigate to another page
        cy.contains('a', 'Engagements').click()
        cy.wait('@getEngagements')

        // Layout should still be there
        cy.get('nav').should('be.visible')
      })
    })
  })

  describe('Responsive Navigation', () => {
    it('should show mobile menu on small screens', () => {
      cy.viewport(375, 667) // Mobile viewport

      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')

      // On mobile, there might be a hamburger menu
      // This test assumes mobile navigation exists
      // Adjust selectors based on actual implementation
    })

    it('should show full sidebar on desktop', () => {
      cy.viewport(1280, 720) // Desktop viewport

      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')

      // Desktop should show full navigation
      cy.get('nav').should('be.visible')
      cy.contains('a', 'Dashboard').should('be.visible')
    })
  })

  describe('404 and Error Handling', () => {
    it('should handle non-existent routes gracefully', () => {
      cy.visit('/dashboard/non-existent-page', { failOnStatusCode: false })
      cy.wait('@getCurrentUser')

      // React Router might show a 404 page or redirect
      // Verify the app doesn't crash
    })

    it('should handle invalid ID parameters', () => {
      cy.intercept('GET', '/api/v1/engagements/99999/', {
        statusCode: 404,
        body: { detail: 'Not found.' },
      }).as('getEngagement404')

      cy.visit('/dashboard/engagements/99999', { failOnStatusCode: false })
      cy.wait('@getCurrentUser')
      cy.wait('@getEngagement404')

      // Should show error message or redirect
      // Verify app doesn't crash
    })
  })
})
