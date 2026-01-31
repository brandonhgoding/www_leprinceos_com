describe('Concessions CRUD Operations', () => {
  beforeEach(() => {
    // Set up authenticated session
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser')
    })

    // Load concessions fixture
    cy.fixture('concessions').then((concessions) => {
      cy.intercept('GET', '/api/v1/concessions/*', {
        statusCode: 200,
        body: concessions,
      }).as('getConcessions')
    })
  })

  describe('List View', () => {
    it('should display list of concession items', () => {
      cy.fixture('concessions').then((concessions) => {
        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        // Verify all concessions are displayed
        concessions.results.forEach((item) => {
          cy.contains(item.name).should('be.visible')
          cy.contains(item.price).should('be.visible')
        })
      })
    })

    it('should filter concessions by category', () => {
      cy.fixture('concessions').then((concessions) => {
        const beverages = concessions.results.filter((item) => item.category === 'beverages')

        cy.intercept('GET', '/api/v1/concessions/*category=beverages*', {
          statusCode: 200,
          body: { count: beverages.length, results: beverages },
        }).as('getBeverages')

        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        // Select beverages filter if available
        cy.get('select[name="category"]').select('beverages')

        cy.wait('@getBeverages')

        // Should only show beverages
        cy.contains('Large Soda').should('be.visible')
        cy.contains('Medium Popcorn').should('not.exist')
      })
    })

    it('should show empty state when no concessions exist', () => {
      cy.intercept('GET', '/api/v1/concessions/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptyConcessions')

      cy.visit('/dashboard/concessions')
      cy.wait('@getCurrentUser')
      cy.wait('@getEmptyConcessions')

      cy.contains(/no concessions/i).should('be.visible')
    })

    it('should show active and inactive items differently', () => {
      cy.fixture('concessions').then((concessions) => {
        // Add inactive item
        const withInactive = {
          ...concessions,
          results: [
            ...concessions.results,
            {
              id: 99,
              name: 'Inactive Item',
              price: '5.00',
              category: 'snacks',
              is_active: false,
              cinema: 1,
            },
          ],
        }

        cy.intercept('GET', '/api/v1/concessions/*', {
          statusCode: 200,
          body: withInactive,
        }).as('getConcessions')

        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        // Inactive items might be grayed out or have a badge
        cy.contains('Inactive Item').should('exist')
      })
    })
  })

  describe('Create Concession', () => {
    it('should open create form', () => {
      cy.visit('/dashboard/concessions')
      cy.wait('@getCurrentUser')
      cy.wait('@getConcessions')

      cy.contains('button', /add|create|new/i).click()

      // Form drawer should be visible
      cy.get('input[name="name"]').should('be.visible')
      cy.get('input[name="price"]').should('be.visible')
    })

    it('should create new concession item with valid data', () => {
      const newItem = {
        name: 'Large Popcorn',
        price: '10.00',
        category: 'snacks',
        description: 'Extra large popcorn bucket',
        is_active: true,
      }

      cy.intercept('POST', '/api/v1/concessions/', (req) => {
        expect(req.body.name).to.eq(newItem.name)
        expect(req.body.price).to.eq(newItem.price)

        req.reply({
          statusCode: 201,
          body: {
            id: 4,
            ...newItem,
            cinema: 1,
          },
        })
      }).as('createConcession')

      cy.visit('/dashboard/concessions')
      cy.wait('@getCurrentUser')
      cy.wait('@getConcessions')

      cy.contains('button', /add|create|new/i).click()

      // Fill form
      cy.get('input[name="name"]').type(newItem.name)
      cy.get('input[name="price"]').type(newItem.price)
      cy.get('select[name="category"]').select(newItem.category)
      cy.get('textarea[name="description"]').type(newItem.description)

      // Submit
      cy.contains('button', /save|submit|create/i).click()

      cy.wait('@createConcession')

      // Should show success message
      cy.contains(/success|created/i).should('be.visible')
    })

    it('should validate required fields', () => {
      cy.visit('/dashboard/concessions')
      cy.wait('@getCurrentUser')
      cy.wait('@getConcessions')

      cy.contains('button', /add|create|new/i).click()

      // Try to submit empty form
      cy.contains('button', /save|submit|create/i).click()

      // Should show validation errors
      cy.contains(/required/i).should('be.visible')
    })

    it('should validate price format', () => {
      cy.visit('/dashboard/concessions')
      cy.wait('@getCurrentUser')
      cy.wait('@getConcessions')

      cy.contains('button', /add|create|new/i).click()

      cy.get('input[name="name"]').type('Test Item')
      cy.get('input[name="price"]').type('invalid')

      cy.contains('button', /save|submit|create/i).click()

      // Should show price validation error
      cy.contains(/price|number|decimal/i).should('be.visible')
    })

    it('should validate price is positive', () => {
      cy.visit('/dashboard/concessions')
      cy.wait('@getCurrentUser')
      cy.wait('@getConcessions')

      cy.contains('button', /add|create|new/i).click()

      cy.get('input[name="name"]').type('Test Item')
      cy.get('input[name="price"]').type('-5.00')

      cy.contains('button', /save|submit|create/i).click()

      // Should show validation error
      cy.contains(/positive|greater than/i).should('be.visible')
    })

    it('should handle API errors during creation', () => {
      cy.intercept('POST', '/api/v1/concessions/', {
        statusCode: 400,
        body: { name: ['Item with this name already exists.'] },
      }).as('createError')

      cy.visit('/dashboard/concessions')
      cy.wait('@getCurrentUser')
      cy.wait('@getConcessions')

      cy.contains('button', /add|create|new/i).click()

      cy.get('input[name="name"]').type('Medium Popcorn')
      cy.get('input[name="price"]').type('8.50')

      cy.contains('button', /save|submit|create/i).click()

      cy.wait('@createError')

      // Should show error message
      cy.contains(/already exists/i).should('be.visible')
    })
  })

  describe('Update Concession', () => {
    it('should open edit form with existing data', () => {
      cy.fixture('concessions').then((concessions) => {
        const item = concessions.results[0]

        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        // Find and click edit button for the item
        cy.contains(item.name).parent().within(() => {
          cy.contains('button', /edit/i).click()
        })

        // Form should populate with existing data
        cy.get('input[name="name"]').should('have.value', item.name)
        cy.get('input[name="price"]').should('have.value', item.price)
      })
    })

    it('should update concession item', () => {
      cy.fixture('concessions').then((concessions) => {
        const item = concessions.results[0]
        const updatedPrice = '9.00'

        cy.intercept('PATCH', `/api/v1/concessions/${item.id}/`, (req) => {
          req.reply({
            statusCode: 200,
            body: {
              ...item,
              price: req.body.price,
            },
          })
        }).as('updateConcession')

        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        cy.contains(item.name).parent().within(() => {
          cy.contains('button', /edit/i).click()
        })

        // Update price
        cy.get('input[name="price"]').clear().type(updatedPrice)

        cy.contains('button', /save|update/i).click()

        cy.wait('@updateConcession')

        cy.contains(/success|updated/i).should('be.visible')
      })
    })

    it('should toggle active status', () => {
      cy.fixture('concessions').then((concessions) => {
        const item = concessions.results[0]

        cy.intercept('PATCH', `/api/v1/concessions/${item.id}/`, (req) => {
          req.reply({
            statusCode: 200,
            body: {
              ...item,
              is_active: req.body.is_active,
            },
          })
        }).as('toggleActive')

        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        cy.contains(item.name).parent().within(() => {
          cy.contains('button', /edit/i).click()
        })

        // Toggle active status
        cy.get('input[name="is_active"]').uncheck()

        cy.contains('button', /save|update/i).click()

        cy.wait('@toggleActive').then((interception) => {
          expect(interception.request.body.is_active).to.be.false
        })
      })
    })
  })

  describe('Delete Concession', () => {
    it('should delete concession after confirmation', () => {
      cy.fixture('concessions').then((concessions) => {
        const item = concessions.results[0]

        cy.intercept('DELETE', `/api/v1/concessions/${item.id}/`, {
          statusCode: 204,
        }).as('deleteConcession')

        // Mock updated list without deleted item
        cy.intercept('GET', '/api/v1/concessions/*', {
          statusCode: 200,
          body: {
            count: concessions.results.length - 1,
            results: concessions.results.slice(1),
          },
        }).as('getConcessionsAfterDelete')

        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        cy.contains(item.name).parent().within(() => {
          cy.contains('button', /delete/i).click()
        })

        // Confirm deletion
        cy.contains('button', /confirm|yes|delete/i).click()

        cy.wait('@deleteConcession')

        // Item should be removed from list
        cy.contains(item.name).should('not.exist')
      })
    })

    it('should cancel deletion', () => {
      cy.fixture('concessions').then((concessions) => {
        const item = concessions.results[0]

        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        cy.contains(item.name).parent().within(() => {
          cy.contains('button', /delete/i).click()
        })

        // Cancel
        cy.contains('button', /cancel|no/i).click()

        // Item should still be visible
        cy.contains(item.name).should('be.visible')
      })
    })
  })

  describe('Search and Filter', () => {
    it('should search concessions by name', () => {
      cy.fixture('concessions').then((concessions) => {
        const searchTerm = 'Popcorn'
        const filtered = concessions.results.filter((item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )

        cy.intercept('GET', `/api/v1/concessions/*search=${searchTerm}*`, {
          statusCode: 200,
          body: { count: filtered.length, results: filtered },
        }).as('searchConcessions')

        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        // Type in search box
        cy.get('input[type="search"]').type(searchTerm)

        cy.wait('@searchConcessions')

        // Should show matching items
        cy.contains('Medium Popcorn').should('be.visible')
        cy.contains('Large Soda').should('not.exist')
      })
    })
  })

  describe('Responsive Design', () => {
    it('should display concessions on mobile', () => {
      cy.viewport(375, 667)

      cy.fixture('concessions').then((concessions) => {
        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        // Should show card layout on mobile
        concessions.results.forEach((item) => {
          cy.contains(item.name).should('be.visible')
        })
      })
    })

    it('should display concessions table on desktop', () => {
      cy.viewport(1280, 720)

      cy.fixture('concessions').then((concessions) => {
        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getConcessions')

        // Should show table layout
        cy.get('table').should('be.visible')
        concessions.results.forEach((item) => {
          cy.contains(item.name).should('be.visible')
        })
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long item names', () => {
      const longName = 'Extra Large Super Deluxe Premium Ultimate Popcorn Combo Bucket'

      cy.intercept('GET', '/api/v1/concessions/*', {
        statusCode: 200,
        body: {
          count: 1,
          results: [
            {
              id: 100,
              name: longName,
              price: '15.00',
              category: 'snacks',
              is_active: true,
              cinema: 1,
            },
          ],
        },
      }).as('getLongName')

      cy.visit('/dashboard/concessions')
      cy.wait('@getCurrentUser')
      cy.wait('@getLongName')

      // Should display without breaking layout
      cy.contains(longName).should('be.visible')
    })

    it('should handle decimal prices correctly', () => {
      cy.visit('/dashboard/concessions')
      cy.wait('@getCurrentUser')
      cy.wait('@getConcessions')

      cy.contains('button', /add|create|new/i).click()

      cy.get('input[name="name"]').type('Test Item')
      cy.get('input[name="price"]').type('12.99')

      // Verify price is displayed correctly
      cy.get('input[name="price"]').should('have.value', '12.99')
    })

    it('should handle prices with different decimal places', () => {
      cy.fixture('concessions').then((concessions) => {
        const items = [
          { ...concessions.results[0], price: '10.5' }, // One decimal place
          { ...concessions.results[1], price: '10.50' }, // Two decimal places
          { ...concessions.results[2], price: '10' }, // No decimal places
        ]

        cy.intercept('GET', '/api/v1/concessions/*', {
          statusCode: 200,
          body: { count: items.length, results: items },
        }).as('getPrices')

        cy.visit('/dashboard/concessions')
        cy.wait('@getCurrentUser')
        cy.wait('@getPrices')

        // All prices should be displayed
        items.forEach((item) => {
          cy.contains(item.price).should('be.visible')
        })
      })
    })
  })
})
