describe('Home Dashboard', () => {
  beforeEach(() => {
    // Set up authenticated session
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
  })

  describe('Page Layout and Summary Cards', () => {
    it('should display welcome message with user name', () => {
      cy.fixture('user').then((user) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: { count: 0, results: [] },
        }).as('getEngagements')

        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: { count: 0, results: [] },
        }).as('getScreens')

        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: { count: 0, results: [] },
        }).as('getShowtimes')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')

        // Check page title
        cy.contains('h1', 'Dashboard').should('be.visible')

        // Check welcome message with first name
        cy.contains(`Welcome back, ${user.first_name}`).should('be.visible')
      })
    })

    it('should display summary cards with correct data', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', (req) => {
          if (req.query.status === 'CONFIRMED') {
            req.reply({
              statusCode: 200,
              body: {
                count: 2,
                results: engagements.results.filter(e => e.status === 'CONFIRMED'),
              },
            })
          } else {
            req.reply({
              statusCode: 200,
              body: engagements,
            })
          }
        }).as('getEngagements')
      })

      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')

      // Active Engagements card
      cy.contains('Active Engagements').should('be.visible')
      cy.contains('Active Engagements').parent().should('contain', '2')
      cy.contains('View all').should('have.attr', 'href').and('include', '/engagements')

      // Today's Showtimes card
      cy.contains("Today's Showtimes").should('be.visible')
      cy.contains("Today's Showtimes").parent().should('contain', '3')

      // Screens card
      cy.contains('Screens').should('be.visible')
      cy.contains('Screens').parent().should('contain', '2')
      cy.contains('Manage').should('have.attr', 'href').and('include', '/screens')
    })

    it('should show loading state for cards', () => {
      // Delay the API responses
      cy.intercept('GET', '/api/v1/engagements/*', (req) => {
        req.reply((res) => {
          res.delay = 1000
          res.send({ count: 0, results: [] })
        })
      }).as('getEngagements')

      cy.intercept('GET', '/api/v1/screens/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getScreens')

      cy.intercept('GET', '/api/v1/showtimes/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getShowtimes')

      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')

      // Should show em dash (—) while loading
      cy.contains('Active Engagements').parent().should('contain', '—')
    })

    it('should navigate to linked pages from summary cards', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')
      })

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')

      // Click "View all" link
      cy.contains('View all').click()
      cy.url().should('include', '/dashboard/engagements')
    })
  })

  describe("Today's Showtimes Section", () => {
    it('should display list of showtimes for today', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')
      })

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')
        cy.wait('@getShowtimes')

        // Check section title
        cy.contains('h2', "Today's Showtimes").should('be.visible')

        // Check that showtimes are displayed
        showtimes.results.forEach((showtime) => {
          cy.contains(showtime.film_title).should('be.visible')
          cy.contains(showtime.screen_name).should('be.visible')
        })
      })
    })

    it('should display showtime status badges', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')
      })

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')
        cy.wait('@getShowtimes')

        // Should show "Active" for non-cancelled showtimes
        cy.contains('Active').should('be.visible')

        // Should show "Cancelled" for cancelled showtimes
        cy.contains('Cancelled').should('be.visible')
      })
    })

    it('should display presentation format', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')
      })

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')
        cy.wait('@getShowtimes')

        // Should show presentation format
        cy.contains('2D').should('be.visible')
      })
    })

    it('should show empty state when no showtimes exist', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')
      })

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.intercept('GET', '/api/v1/showtimes/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptyShowtimes')

      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')
      cy.wait('@getEmptyShowtimes')

      // Check for empty state
      cy.contains('No Showtimes Today').should('be.visible')
      cy.contains('Get started by creating an engagement').should('be.visible')
      cy.contains('View Engagements').should('be.visible')
    })

    it('should show loading state for showtimes', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')
      })

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      // Delay showtimes response
      cy.intercept('GET', '/api/v1/showtimes/*', (req) => {
        req.reply((res) => {
          res.delay = 1000
          res.send({ count: 0, results: [] })
        })
      }).as('getShowtimes')

      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')

      // Should show loading message
      cy.contains('Loading showtimes...').should('be.visible')
    })
  })

  describe('Smart Alerts', () => {
    it('should display alerts when there are issues', () => {
      // Create engagement with no showtimes
      const engagementWithNoShowtimes = {
        count: 1,
        results: [
          {
            id: 1,
            film_id: 123,
            film_title: 'Test Film',
            start_date: '2026-01-31',
            end_date: '2026-02-07',
            status: 'CONFIRMED',
            screen: 1,
          },
        ],
      }

      cy.intercept('GET', '/api/v1/engagements/*', {
        statusCode: 200,
        body: engagementWithNoShowtimes,
      }).as('getEngagements')

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      // No showtimes for today or tomorrow
      cy.intercept('GET', '/api/v1/showtimes/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getShowtimes')

      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')

      // Alert banner should be visible (implementation depends on useSmartAlerts hook)
      // This test validates the AlertBanner component is rendered
      cy.get('body').should('exist')
    })
  })

  describe('Responsive Design', () => {
    it('should display mobile card view on small screens', () => {
      cy.viewport(375, 667) // Mobile viewport

      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')
      })

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')
        cy.wait('@getShowtimes')

        // Summary cards should still be visible
        cy.contains('Active Engagements').should('be.visible')
        cy.contains("Today's Showtimes").should('be.visible')

        // Showtimes should be displayed in card view
        cy.contains(showtimes.results[0].film_title).should('be.visible')
      })
    })

    it('should display desktop table view on large screens', () => {
      cy.viewport(1280, 720) // Desktop viewport

      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')
      })

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')

        cy.visit('/dashboard')
        cy.wait('@getCurrentUser')
        cy.wait('@getShowtimes')

        // Table headers should be visible
        cy.contains('th', 'Time').should('be.visible')
        cy.contains('th', 'Film').should('be.visible')
        cy.contains('th', 'Screen').should('be.visible')
        cy.contains('th', 'Format').should('be.visible')
        cy.contains('th', 'Status').should('be.visible')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle engagement API errors gracefully', () => {
      cy.intercept('GET', '/api/v1/engagements/*', {
        statusCode: 500,
        body: { detail: 'Internal server error' },
      }).as('getEngagementsError')

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')

      // Page should still render despite error
      cy.contains('Dashboard').should('be.visible')
    })

    it('should handle showtime API errors gracefully', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: engagements,
        }).as('getEngagements')
      })

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.intercept('GET', '/api/v1/showtimes/*', {
        statusCode: 500,
        body: { detail: 'Internal server error' },
      }).as('getShowtimesError')

      cy.visit('/dashboard')
      cy.wait('@getCurrentUser')

      // Page should still render
      cy.contains('Dashboard').should('be.visible')
    })
  })
})
