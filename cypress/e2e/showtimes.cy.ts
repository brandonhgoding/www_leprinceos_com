describe('Showtimes CRUD Operations', () => {
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

  describe('List View', () => {
    it('should display list of showtimes', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')
      cy.wait('@getShowtimes')

      // Verify showtimes are displayed
      cy.fixture('showtimes').then((showtimes) => {
        showtimes.results.forEach((showtime) => {
          cy.contains(showtime.film_title).should('be.visible')
          cy.contains(showtime.screen_name).should('be.visible')
        })
      })
    })

    it('should display showtime status badges', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')
      cy.wait('@getShowtimes')

      // Check for status badges
      cy.contains('Active').should('be.visible')
      cy.contains('Cancelled').should('be.visible')
    })

    it('should display captions information', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')
      cy.wait('@getShowtimes')

      // Check for captions
      cy.contains('CC').should('be.visible') // Closed Captions
      cy.contains('OC').should('be.visible') // Open Captions
    })

    it('should show empty state when no showtimes exist', () => {
      cy.intercept('GET', '/api/v1/showtimes/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptyShowtimes')

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')
      cy.wait('@getEmptyShowtimes')

      // Check for empty state
      cy.contains('No Showtimes Scheduled').should('be.visible')
      cy.contains('Schedule First Showtime').should('be.visible')
    })

    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '/api/v1/showtimes/*', {
        statusCode: 500,
        body: { detail: 'Internal server error' },
      }).as('getShowtimesError')

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Page should still render
      cy.contains('Showtimes').should('be.visible')
    })
  })

  describe('Filtering', () => {
    it('should filter showtimes by engagement', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', (req) => {
          if (req.query.engagement === '1') {
            req.reply({
              statusCode: 200,
              body: {
                count: 2,
                results: showtimes.results.filter(s => s.engagement === 1),
              },
            })
          } else {
            req.reply({
              statusCode: 200,
              body: showtimes,
            })
          }
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Select engagement filter
      cy.get('select').first().select('The Grand Budapest Hotel')
      cy.wait('@getShowtimes')

      // Should only show showtimes for that engagement
      cy.contains('The Grand Budapest Hotel').should('be.visible')
    })

    it('should filter showtimes by date', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', (req) => {
          if (req.query.date) {
            req.reply({
              statusCode: 200,
              body: {
                count: 1,
                results: showtimes.results.slice(0, 1),
              },
            })
          } else {
            req.reply({
              statusCode: 200,
              body: showtimes,
            })
          }
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Set date filter
      cy.get('input[type="date"]').type('2026-02-01')
      cy.wait('@getShowtimes')
    })

    it('should clear filters', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Set filters
      cy.get('select').first().select('The Grand Budapest Hotel')
      cy.get('input[type="date"]').type('2026-02-01')

      // Clear filters button should appear
      cy.contains('Clear Filters').should('be.visible').click()

      // Filters should be reset
      cy.get('select').first().should('have.value', '')
      cy.get('input[type="date"]').should('have.value', '')
    })

    it('should show filtered empty state', () => {
      cy.intercept('GET', '/api/v1/showtimes/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptyShowtimes')

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Set a filter
      cy.get('input[type="date"]').type('2026-02-01')
      cy.wait('@getEmptyShowtimes')

      // Should show filtered empty state
      cy.contains('No Showtimes Found').should('be.visible')
      cy.contains('Clear Filters').should('be.visible')
    })
  })

  describe('Create Showtime', () => {
    it('should open create drawer when clicking New Showtime button', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Click New Showtime button
      cy.contains('button', '+ New Showtime').click()

      // Drawer should open
      cy.contains('New Showtime').should('be.visible')
      cy.contains('label', 'Engagement').should('be.visible')
      cy.contains('label', 'Date').should('be.visible')
      cy.contains('label', 'Time').should('be.visible')
    })

    it('should create a new showtime successfully', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')

        const newShowtime = {
          id: 4,
          engagement: 1,
          film_title: 'The Grand Budapest Hotel',
          screen: 1,
          screen_name: 'Screen 1',
          starts_at: '2026-02-02T20:00:00Z',
          is_cancelled: false,
          captions: 'CC',
          presentation_format_display: '2D',
          is_outside_engagement_range: false,
        }

        cy.intercept('POST', '/api/v1/showtimes/', {
          statusCode: 201,
          body: newShowtime,
        }).as('createShowtime')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Showtime').click()

      // Fill out form
      cy.get('select').first().select('The Grand Budapest Hotel')
      cy.get('input[type="date"]').type('2026-02-02')
      cy.get('input[type="time"]').type('20:00')
      cy.get('select').eq(2).select('CC') // Captions

      // Submit form
      cy.contains('button', 'Create Showtime').click()

      // Wait for API call
      cy.wait('@createShowtime')
      cy.wait('@getShowtimes')

      // Drawer should close
      cy.contains('New Showtime').should('not.exist')
    })

    it('should validate required fields', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Showtime').click()

      // Try to submit without filling required fields
      cy.contains('button', 'Create Showtime').click()

      // Form validation should prevent submission
      cy.contains('New Showtime').should('be.visible')
    })

    it('should close drawer when clicking Cancel', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Showtime').click()

      // Click Cancel
      cy.contains('button', 'Cancel').click()

      // Drawer should close
      cy.contains('New Showtime').should('not.exist')
    })
  })

  describe('Edit Showtime', () => {
    it('should open edit drawer when clicking Edit button', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')
      cy.wait('@getShowtimes')

      // Click Edit button
      cy.contains('button', 'Edit').first().click()

      // Drawer should open with title
      cy.contains('Edit Showtime').should('be.visible')

      // Form should be pre-populated
      cy.get('select').first().should('not.have.value', '')
    })

    it('should update showtime successfully', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')

        const updatedShowtime = {
          ...showtimes.results[0],
          is_cancelled: true,
        }

        cy.intercept('PATCH', '/api/v1/showtimes/1/', {
          statusCode: 200,
          body: updatedShowtime,
        }).as('updateShowtime')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')
      cy.wait('@getShowtimes')

      // Click Edit button
      cy.contains('button', 'Edit').first().click()

      // Mark as cancelled
      cy.get('input[type="checkbox"]').check()

      // Submit form
      cy.contains('button', 'Save Changes').click()

      // Wait for API call
      cy.wait('@updateShowtime')
      cy.wait('@getShowtimes')

      // Drawer should close
      cy.contains('Edit Showtime').should('not.exist')
    })
  })

  describe('Delete Showtime', () => {
    it('should delete showtime after confirmation', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')

        cy.intercept('DELETE', '/api/v1/showtimes/1/', {
          statusCode: 204,
        }).as('deleteShowtime')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')
      cy.wait('@getShowtimes')

      // Stub window.confirm to return true
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true)
      })

      // Click Delete button
      cy.contains('button', 'Delete').first().click()

      // Wait for API call
      cy.wait('@deleteShowtime')
      cy.wait('@getShowtimes')
    })

    it('should not delete showtime if user cancels confirmation', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')
      cy.wait('@getShowtimes')

      // Stub window.confirm to return false
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false)
      })

      // Click Delete button
      cy.contains('button', 'Delete').first().click()

      // Showtime should still be visible
      cy.contains('The Grand Budapest Hotel').should('be.visible')
    })
  })

  describe('Bulk Create Showtimes', () => {
    it('should open bulk create drawer when clicking Bulk Create button', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Click Bulk Create button
      cy.contains('button', 'Bulk Create').click()

      // Drawer should open
      cy.contains('Bulk Create Showtimes').should('be.visible')
      cy.contains('label', 'Start Date').should('be.visible')
      cy.contains('label', 'End Date').should('be.visible')
      cy.contains('label', 'Show Times').should('be.visible')
    })

    it('should add and remove time slots', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Open bulk create drawer
      cy.contains('button', 'Bulk Create').click()

      // Initially should have 1 time slot
      cy.get('input[type="time"]').should('have.length', 1)

      // Click Add Time
      cy.contains('button', '+ Add Time').click()

      // Should now have 2 time slots
      cy.get('input[type="time"]').should('have.length', 2)

      // Remove a time slot (should see × button)
      cy.contains('button', '×').first().click()

      // Should be back to 1 time slot
      cy.get('input[type="time"]').should('have.length', 1)
    })

    it('should display showtime count calculation', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Open bulk create drawer
      cy.contains('button', 'Bulk Create').click()

      // Fill out form
      cy.get('select').first().select('The Grand Budapest Hotel')
      cy.get('input[type="date"]').eq(0).type('2026-02-01')
      cy.get('input[type="date"]').eq(1).type('2026-02-07')
      cy.get('input[type="time"]').type('14:00')

      // Add another time slot
      cy.contains('button', '+ Add Time').click()
      cy.get('input[type="time"]').eq(1).type('19:30')

      // Should show calculation: 7 days × 2 times = 14 showtimes
      cy.contains('This will create').should('be.visible')
      cy.contains('14').should('be.visible')
      cy.contains('showtimes').should('be.visible')
    })

    it('should create bulk showtimes successfully', () => {
      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')

        cy.intercept('POST', '/api/v1/showtimes/bulk/', {
          statusCode: 201,
          body: { created: 14 },
        }).as('bulkCreateShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')

      // Open bulk create drawer
      cy.contains('button', 'Bulk Create').click()

      // Fill out form
      cy.get('select').first().select('The Grand Budapest Hotel')
      cy.get('input[type="date"]').eq(0).type('2026-02-01')
      cy.get('input[type="date"]').eq(1).type('2026-02-07')
      cy.get('input[type="time"]').type('14:00')

      // Submit form
      cy.contains('button', 'Create Showtimes').click()

      // Wait for API call
      cy.wait('@bulkCreateShowtimes')
      cy.wait('@getShowtimes')

      // Drawer should close
      cy.contains('Bulk Create Showtimes').should('not.exist')
    })
  })

  describe('Responsive Design', () => {
    it('should display mobile card view on small screens', () => {
      cy.viewport(375, 667) // Mobile viewport

      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')
      cy.wait('@getShowtimes')

      // Showtimes should be visible
      cy.contains('The Grand Budapest Hotel').should('be.visible')
      cy.contains('Moonrise Kingdom').should('be.visible')
    })

    it('should display desktop table view on large screens', () => {
      cy.viewport(1280, 720) // Desktop viewport

      cy.fixture('showtimes').then((showtimes) => {
        cy.intercept('GET', '/api/v1/showtimes/*', {
          statusCode: 200,
          body: showtimes,
        }).as('getShowtimes')
      })

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

      cy.visit('/dashboard/showtimes')
      cy.wait('@getCurrentUser')
      cy.wait('@getShowtimes')

      // Table headers should be visible
      cy.contains('th', 'Film').should('be.visible')
      cy.contains('th', 'Screen').should('be.visible')
      cy.contains('th', 'Date & Time').should('be.visible')
      cy.contains('th', 'Captions').should('be.visible')
      cy.contains('th', 'Status').should('be.visible')
      cy.contains('th', 'Actions').should('be.visible')
    })
  })
})
