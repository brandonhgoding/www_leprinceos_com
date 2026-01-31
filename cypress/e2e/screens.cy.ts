describe('Screens CRUD Operations', () => {
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
    it('should display list of screens', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Verify screens are displayed
      cy.fixture('screens').then((screens) => {
        screens.results.forEach((screen) => {
          cy.contains(screen.name).should('be.visible')
        })
      })
    })

    it('should display screen details', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Check for screen details
      cy.contains('150 seats').should('be.visible')
      cy.contains('Standard').should('be.visible')
      cy.contains('Flat (1.85:1)').should('be.visible')
      cy.contains('Dolby Atmos').should('be.visible')
    })

    it('should display 3D capability badge', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Check for 3D badge on screens that support it
      cy.contains('3D').should('be.visible')
    })

    it('should show empty state when no screens exist', () => {
      cy.intercept('GET', '/api/v1/screens/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptyScreens')

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getEmptyScreens')

      // Check for empty state
      cy.contains('No Screens Configured').should('be.visible')
      cy.contains('Define your cinema\'s auditoriums').should('be.visible')
      cy.contains('Add First Screen').should('be.visible')
    })

    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '/api/v1/screens/*', {
        statusCode: 500,
        body: { detail: 'Internal server error' },
      }).as('getScreensError')

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')

      // Page should still render
      cy.contains('Screens').should('be.visible')
    })
  })

  describe('Create Screen', () => {
    it('should open create drawer when clicking New Screen button', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')

      // Click New Screen button
      cy.contains('button', '+ New Screen').click()

      // Drawer should open
      cy.contains('New Screen').should('be.visible')
      cy.contains('label', 'Screen Name').should('be.visible')
      cy.contains('label', 'Capacity (seats)').should('be.visible')
      cy.contains('label', 'Screen Type').should('be.visible')
    })

    it('should create a new screen successfully', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')

        const newScreen = {
          id: 3,
          name: 'Screen 3',
          capacity: 200,
          screen_type: 'imax',
          aspect_ratio: 'imax_190',
          sound_system: 'dolby_atmos',
          supports_3d: true,
        }

        cy.intercept('POST', '/api/v1/screens/', {
          statusCode: 201,
          body: newScreen,
        }).as('createScreen')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Screen').click()

      // Fill out form
      cy.get('input[placeholder*="Screen"]').type('Screen 3')
      cy.get('input[type="number"]').type('200')
      cy.get('select').eq(0).select('IMAX')
      cy.get('select').eq(1).select('IMAX 1.90:1')
      cy.get('select').eq(2).select('Dolby Atmos')
      cy.get('input[type="checkbox"]').check()

      // Submit form
      cy.contains('button', 'Create Screen').click()

      // Wait for API call
      cy.wait('@createScreen')
      cy.wait('@getScreens')

      // Drawer should close
      cy.contains('New Screen').should('not.exist')
    })

    it('should validate required fields', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Screen').click()

      // Try to submit without filling required fields
      cy.contains('button', 'Create Screen').click()

      // Form validation should prevent submission
      cy.contains('New Screen').should('be.visible')
    })

    it('should validate capacity is positive', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Screen').click()

      // Try to enter negative capacity
      cy.get('input[placeholder*="Screen"]').type('Test Screen')
      cy.get('input[type="number"]').type('-10')

      // HTML5 validation should prevent this (min="1")
      cy.get('input[type="number"]').should('have.attr', 'min', '1')
    })

    it('should close drawer when clicking Cancel', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Screen').click()

      // Click Cancel
      cy.contains('button', 'Cancel').click()

      // Drawer should close
      cy.contains('New Screen').should('not.exist')
    })

    it('should open create drawer from empty state', () => {
      cy.intercept('GET', '/api/v1/screens/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptyScreens')

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getEmptyScreens')

      // Click "Add First Screen" button from empty state
      cy.contains('button', 'Add First Screen').click()

      // Drawer should open
      cy.contains('New Screen').should('be.visible')
    })
  })

  describe('Edit Screen', () => {
    it('should open edit drawer when clicking Edit button', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Click Edit button
      cy.contains('button', 'Edit').first().click()

      // Drawer should open with title
      cy.contains('Edit Screen').should('be.visible')

      // Form should be pre-populated
      cy.get('input[placeholder*="Screen"]').should('have.value', 'Screen 1')
      cy.get('input[type="number"]').should('have.value', '150')
    })

    it('should update screen successfully', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')

        const updatedScreen = {
          ...screens.results[0],
          capacity: 175,
        }

        cy.intercept('PATCH', '/api/v1/screens/1/', {
          statusCode: 200,
          body: updatedScreen,
        }).as('updateScreen')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Click Edit button
      cy.contains('button', 'Edit').first().click()

      // Update capacity
      cy.get('input[type="number"]').clear().type('175')

      // Submit form
      cy.contains('button', 'Save Changes').click()

      // Wait for API call
      cy.wait('@updateScreen')
      cy.wait('@getScreens')

      // Drawer should close
      cy.contains('Edit Screen').should('not.exist')
    })

    it('should allow changing screen type', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')

        const updatedScreen = {
          ...screens.results[0],
          screen_type: 'imax',
        }

        cy.intercept('PATCH', '/api/v1/screens/1/', {
          statusCode: 200,
          body: updatedScreen,
        }).as('updateScreen')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Click Edit button
      cy.contains('button', 'Edit').first().click()

      // Change screen type
      cy.get('select').eq(0).select('IMAX')

      // Submit form
      cy.contains('button', 'Save Changes').click()

      // Wait for API call
      cy.wait('@updateScreen')
      cy.wait('@getScreens')
    })

    it('should toggle 3D support', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')

        const updatedScreen = {
          ...screens.results[0],
          supports_3d: false,
        }

        cy.intercept('PATCH', '/api/v1/screens/1/', {
          statusCode: 200,
          body: updatedScreen,
        }).as('updateScreen')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Click Edit button on first screen (which has 3D enabled)
      cy.contains('button', 'Edit').first().click()

      // Toggle 3D support off
      cy.get('input[type="checkbox"]').uncheck()

      // Submit form
      cy.contains('button', 'Save Changes').click()

      // Wait for API call
      cy.wait('@updateScreen')
      cy.wait('@getScreens')
    })
  })

  describe('Delete Screen', () => {
    it('should delete screen after confirmation', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')

        cy.intercept('DELETE', '/api/v1/screens/1/', {
          statusCode: 204,
        }).as('deleteScreen')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Stub window.confirm to return true
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true)
      })

      // Click Delete button
      cy.contains('button', 'Delete').first().click()

      // Wait for API call
      cy.wait('@deleteScreen')
      cy.wait('@getScreens')
    })

    it('should show warning message in delete confirmation', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Spy on window.confirm
      cy.window().then((win) => {
        cy.stub(win, 'confirm').callsFake((message) => {
          // Verify the warning message mentions impact on engagements/showtimes
          expect(message).to.include('Screen 1')
          expect(message).to.include('engagements')
          expect(message).to.include('showtimes')
          return false
        })
      })

      // Click Delete button
      cy.contains('button', 'Delete').first().click()
    })

    it('should not delete screen if user cancels confirmation', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Stub window.confirm to return false
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false)
      })

      // Click Delete button
      cy.contains('button', 'Delete').first().click()

      // Screen should still be visible
      cy.contains('Screen 1').should('be.visible')
    })
  })

  describe('Screen Types and Capabilities', () => {
    it('should display different screen type badges', () => {
      const screensWithTypes = {
        count: 3,
        results: [
          {
            id: 1,
            name: 'Standard Screen',
            capacity: 100,
            screen_type: 'standard',
            aspect_ratio: 'flat',
            sound_system: 'standard',
            supports_3d: false,
          },
          {
            id: 2,
            name: 'IMAX Theater',
            capacity: 300,
            screen_type: 'imax',
            aspect_ratio: 'imax_190',
            sound_system: 'dolby_atmos',
            supports_3d: true,
          },
          {
            id: 3,
            name: 'Dolby Cinema',
            capacity: 200,
            screen_type: 'dolby_cinema',
            aspect_ratio: 'scope',
            sound_system: 'dolby_atmos',
            supports_3d: false,
          },
        ],
      }

      cy.intercept('GET', '/api/v1/screens/*', {
        statusCode: 200,
        body: screensWithTypes,
      }).as('getScreens')

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Check for different type badges
      cy.contains('Standard').should('be.visible')
      cy.contains('IMAX').should('be.visible')
      cy.contains('Dolby Cinema').should('be.visible')
    })

    it('should display all aspect ratio options in form', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Screen').click()

      // Check aspect ratio options
      cy.get('select').eq(1).within(() => {
        cy.contains('option', 'Flat (1.85:1)').should('exist')
        cy.contains('option', 'Scope (2.39:1)').should('exist')
        cy.contains('option', 'IMAX 1.90:1').should('exist')
        cy.contains('option', 'IMAX 1.43:1').should('exist')
      })
    })

    it('should display all sound system options in form', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Screen').click()

      // Check sound system options
      cy.get('select').eq(2).within(() => {
        cy.contains('option', 'Standard').should('exist')
        cy.contains('option', 'Dolby Digital').should('exist')
        cy.contains('option', 'Dolby Atmos').should('exist')
      })
    })
  })

  describe('Responsive Design', () => {
    it('should display mobile card view on small screens', () => {
      cy.viewport(375, 667) // Mobile viewport

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Screens should be visible in card format
      cy.contains('Screen 1').should('be.visible')
      cy.contains('Screen 2').should('be.visible')
      cy.contains('150 seats').should('be.visible')
    })

    it('should display desktop table view on large screens', () => {
      cy.viewport(1280, 720) // Desktop viewport

      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')
      cy.wait('@getScreens')

      // Table headers should be visible
      cy.contains('th', 'Name').should('be.visible')
      cy.contains('th', 'Capacity').should('be.visible')
      cy.contains('th', 'Type').should('be.visible')
      cy.contains('th', 'Aspect Ratio').should('be.visible')
      cy.contains('th', 'Sound').should('be.visible')
      cy.contains('th', '3D').should('be.visible')
      cy.contains('th', 'Actions').should('be.visible')
    })
  })

  describe('Form Validation Edge Cases', () => {
    it('should handle very large capacity values', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')

        const newScreen = {
          id: 3,
          name: 'Large Theater',
          capacity: 5000,
          screen_type: 'imax',
          aspect_ratio: 'imax_190',
          sound_system: 'dolby_atmos',
          supports_3d: true,
        }

        cy.intercept('POST', '/api/v1/screens/', {
          statusCode: 201,
          body: newScreen,
        }).as('createScreen')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Screen').click()

      // Fill out form with large capacity
      cy.get('input[placeholder*="Screen"]').type('Large Theater')
      cy.get('input[type="number"]').type('5000')
      cy.get('select').eq(0).select('IMAX')
      cy.get('select').eq(1).select('IMAX 1.90:1')
      cy.get('select').eq(2).select('Dolby Atmos')

      // Submit form
      cy.contains('button', 'Create Screen').click()

      // Wait for API call
      cy.wait('@createScreen')
    })

    it('should handle long screen names', () => {
      cy.fixture('screens').then((screens) => {
        cy.intercept('GET', '/api/v1/screens/*', {
          statusCode: 200,
          body: screens,
        }).as('getScreens')

        const newScreen = {
          id: 3,
          name: 'The Grand Luxury IMAX Theater with State-of-the-Art Sound System',
          capacity: 200,
          screen_type: 'imax',
          aspect_ratio: 'imax_190',
          sound_system: 'dolby_atmos',
          supports_3d: true,
        }

        cy.intercept('POST', '/api/v1/screens/', {
          statusCode: 201,
          body: newScreen,
        }).as('createScreen')
      })

      cy.visit('/dashboard/screens')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Screen').click()

      // Fill out form with long name
      cy.get('input[placeholder*="Screen"]').type('The Grand Luxury IMAX Theater with State-of-the-Art Sound System')
      cy.get('input[type="number"]').type('200')
      cy.get('select').eq(0).select('IMAX')
      cy.get('select').eq(1).select('IMAX 1.90:1')
      cy.get('select').eq(2).select('Dolby Atmos')

      // Submit form
      cy.contains('button', 'Create Screen').click()

      // Wait for API call
      cy.wait('@createScreen')
    })
  })
})
