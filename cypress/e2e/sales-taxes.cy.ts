describe('Sales Taxes CRUD Operations', () => {
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
    it('should display list of sales taxes', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Verify sales taxes are displayed
      cy.contains('Maine State Tax').should('be.visible')
      cy.contains('Portland City Tax').should('be.visible')
    })

    it('should display tax details correctly', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Check tax rate display
      cy.contains('5.5%').should('be.visible')
      cy.contains('2.0%').should('be.visible')

      // Check type badges
      cy.contains('State').should('be.visible')
      cy.contains('City').should('be.visible')

      // Check application type
      cy.contains('Added to price').should('be.visible')

      // Check status
      cy.contains('Active').should('be.visible')

      // Check usage counts
      cy.contains('12 items, 3 tickets').should('be.visible')
      cy.contains('8 items, 0 tickets').should('be.visible')
    })

    it('should show inactive status for inactive taxes', () => {
      const salesTaxesWithInactive = {
        count: 1,
        results: [
          {
            id: 1,
            name: 'Inactive Tax',
            percentage: '3.0',
            tax_type: 'county',
            inclusion_type: 'additive',
            is_active: false,
            concession_items_count: 0,
            ticket_types_count: 0,
          },
        ],
      }

      cy.intercept('GET', '/api/v1/sales-taxes/*', {
        statusCode: 200,
        body: salesTaxesWithInactive,
      }).as('getSalesTaxes')

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      cy.contains('Inactive').should('be.visible')
    })

    it('should show empty state when no sales taxes exist', () => {
      cy.intercept('GET', '/api/v1/sales-taxes/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptySalesTaxes')

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getEmptySalesTaxes')

      // Check for empty state
      cy.contains('No Sales Taxes Configured').should('be.visible')
      cy.contains('Configure sales taxes that apply to your ticket sales').should('be.visible')
      cy.contains('Add First Sales Tax').should('be.visible')
    })

    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '/api/v1/sales-taxes/*', {
        statusCode: 500,
        body: { detail: 'Internal server error' },
      }).as('getSalesTaxesError')

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')

      // Page should still render
      cy.contains('Sales Taxes').should('be.visible')
    })
  })

  describe('Create Sales Tax', () => {
    it('should open create drawer when clicking New Sales Tax button', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')

      // Click New Sales Tax button
      cy.contains('button', '+ New Sales Tax').click()

      // Drawer should open
      cy.contains('New Sales Tax').should('be.visible')
      cy.contains('label', 'Name').should('be.visible')
      cy.contains('label', 'Rate (%)').should('be.visible')
      cy.contains('label', 'Tax Type').should('be.visible')
      cy.contains('label', 'Application').should('be.visible')
    })

    it('should create a new sales tax successfully', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')

        const newTax = {
          id: 3,
          name: 'County Tax',
          percentage: '1.5',
          tax_type: 'county',
          inclusion_type: 'additive',
          is_active: true,
          concession_items_count: 0,
          ticket_types_count: 0,
        }

        cy.intercept('POST', '/api/v1/sales-taxes/', {
          statusCode: 201,
          body: newTax,
        }).as('createSalesTax')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Sales Tax').click()

      // Fill out form
      cy.get('input[placeholder*="Maine"]').type('County Tax')
      cy.get('input[placeholder*="5.5"]').type('1.5')
      cy.get('select').eq(0).select('County')
      cy.get('select').eq(1).select('Additive (added to price)')

      // Submit form
      cy.contains('button', 'Create Sales Tax').click()

      // Wait for API call
      cy.wait('@createSalesTax')
      cy.wait('@getSalesTaxes')

      // Drawer should close
      cy.contains('New Sales Tax').should('not.exist')
    })

    it('should validate required fields', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Sales Tax').click()

      // Try to submit without filling required fields
      cy.contains('button', 'Create Sales Tax').click()

      // Form validation should prevent submission
      cy.contains('New Sales Tax').should('be.visible')
    })

    it('should create inactive tax when checkbox is unchecked', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')

        const newTax = {
          id: 3,
          name: 'Future Tax',
          percentage: '7.0',
          tax_type: 'other',
          inclusion_type: 'additive',
          is_active: false,
          concession_items_count: 0,
          ticket_types_count: 0,
        }

        cy.intercept('POST', '/api/v1/sales-taxes/', {
          statusCode: 201,
          body: newTax,
        }).as('createSalesTax')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Sales Tax').click()

      // Fill out form
      cy.get('input[placeholder*="Maine"]').type('Future Tax')
      cy.get('input[placeholder*="5.5"]').type('7.0')
      cy.get('select').eq(0).select('Other')

      // Uncheck active checkbox
      cy.get('input[type="checkbox"]').uncheck()

      // Submit form
      cy.contains('button', 'Create Sales Tax').click()

      // Wait for API call
      cy.wait('@createSalesTax')
    })

    it('should support inclusive tax type', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')

        const newTax = {
          id: 3,
          name: 'Inclusive Tax',
          percentage: '10.0',
          tax_type: 'state',
          inclusion_type: 'inclusive',
          is_active: true,
          concession_items_count: 0,
          ticket_types_count: 0,
        }

        cy.intercept('POST', '/api/v1/sales-taxes/', {
          statusCode: 201,
          body: newTax,
        }).as('createSalesTax')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Sales Tax').click()

      // Fill out form with inclusive type
      cy.get('input[placeholder*="Maine"]').type('Inclusive Tax')
      cy.get('input[placeholder*="5.5"]').type('10.0')
      cy.get('select').eq(1).select('Inclusive (included in price)')

      // Submit form
      cy.contains('button', 'Create Sales Tax').click()

      // Wait for API call
      cy.wait('@createSalesTax')
    })

    it('should close drawer when clicking Cancel', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Sales Tax').click()

      // Click Cancel
      cy.contains('button', 'Cancel').click()

      // Drawer should close
      cy.contains('New Sales Tax').should('not.exist')
    })

    it('should open create drawer from empty state', () => {
      cy.intercept('GET', '/api/v1/sales-taxes/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptySalesTaxes')

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getEmptySalesTaxes')

      // Click "Add First Sales Tax" button from empty state
      cy.contains('button', 'Add First Sales Tax').click()

      // Drawer should open
      cy.contains('New Sales Tax').should('be.visible')
    })
  })

  describe('Edit Sales Tax', () => {
    it('should open edit drawer when clicking Edit button', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Click Edit button
      cy.contains('button', 'Edit').first().click()

      // Drawer should open with title
      cy.contains('Edit Sales Tax').should('be.visible')

      // Form should be pre-populated
      cy.get('input[placeholder*="Maine"]').should('have.value', 'Maine State Tax')
      cy.get('input[placeholder*="5.5"]').should('have.value', '5.5')
    })

    it('should update sales tax successfully', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')

        const updatedTax = {
          ...salesTaxes.results[0],
          percentage: '6.0',
        }

        cy.intercept('PATCH', '/api/v1/sales-taxes/1/', {
          statusCode: 200,
          body: updatedTax,
        }).as('updateSalesTax')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Click Edit button
      cy.contains('button', 'Edit').first().click()

      // Update percentage
      cy.get('input[placeholder*="5.5"]').clear().type('6.0')

      // Submit form
      cy.contains('button', 'Save Changes').click()

      // Wait for API call
      cy.wait('@updateSalesTax')
      cy.wait('@getSalesTaxes')

      // Drawer should close
      cy.contains('Edit Sales Tax').should('not.exist')
    })

    it('should toggle active status', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')

        const updatedTax = {
          ...salesTaxes.results[0],
          is_active: false,
        }

        cy.intercept('PATCH', '/api/v1/sales-taxes/1/', {
          statusCode: 200,
          body: updatedTax,
        }).as('updateSalesTax')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Click Edit button
      cy.contains('button', 'Edit').first().click()

      // Toggle active status off
      cy.get('input[type="checkbox"]').uncheck()

      // Submit form
      cy.contains('button', 'Save Changes').click()

      // Wait for API call
      cy.wait('@updateSalesTax')
      cy.wait('@getSalesTaxes')
    })

    it('should change tax type', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')

        const updatedTax = {
          ...salesTaxes.results[1],
          tax_type: 'local',
        }

        cy.intercept('PATCH', '/api/v1/sales-taxes/2/', {
          statusCode: 200,
          body: updatedTax,
        }).as('updateSalesTax')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Click Edit button on second tax
      cy.contains('button', 'Edit').eq(1).click()

      // Change tax type
      cy.get('select').eq(0).select('Local')

      // Submit form
      cy.contains('button', 'Save Changes').click()

      // Wait for API call
      cy.wait('@updateSalesTax')
    })

    it('should change inclusion type', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')

        const updatedTax = {
          ...salesTaxes.results[0],
          inclusion_type: 'inclusive',
        }

        cy.intercept('PATCH', '/api/v1/sales-taxes/1/', {
          statusCode: 200,
          body: updatedTax,
        }).as('updateSalesTax')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Click Edit button
      cy.contains('button', 'Edit').first().click()

      // Change inclusion type
      cy.get('select').eq(1).select('Inclusive (included in price)')

      // Submit form
      cy.contains('button', 'Save Changes').click()

      // Wait for API call
      cy.wait('@updateSalesTax')
    })
  })

  describe('Delete Sales Tax', () => {
    it('should delete sales tax after confirmation', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')

        cy.intercept('DELETE', '/api/v1/sales-taxes/1/', {
          statusCode: 204,
        }).as('deleteSalesTax')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Stub window.confirm to return true
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true)
      })

      // Click Delete button
      cy.contains('button', 'Delete').first().click()

      // Wait for API call
      cy.wait('@deleteSalesTax')
      cy.wait('@getSalesTaxes')
    })

    it('should show confirmation dialog with tax name', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Spy on window.confirm
      cy.window().then((win) => {
        cy.stub(win, 'confirm').callsFake((message) => {
          // Verify the confirmation message includes the tax name
          expect(message).to.include('Maine State Tax')
          return false
        })
      })

      // Click Delete button
      cy.contains('button', 'Delete').first().click()
    })

    it('should not delete sales tax if user cancels confirmation', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Stub window.confirm to return false
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(false)
      })

      // Click Delete button
      cy.contains('button', 'Delete').first().click()

      // Sales tax should still be visible
      cy.contains('Maine State Tax').should('be.visible')
    })
  })

  describe('Tax Type Options', () => {
    it('should display all tax type options in form', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Sales Tax').click()

      // Check tax type options
      cy.get('select').eq(0).within(() => {
        cy.contains('option', 'State').should('exist')
        cy.contains('option', 'Local').should('exist')
        cy.contains('option', 'County').should('exist')
        cy.contains('option', 'City').should('exist')
        cy.contains('option', 'Other').should('exist')
      })
    })

    it('should display different tax type badges in list', () => {
      const salesTaxesWithTypes = {
        count: 5,
        results: [
          {
            id: 1,
            name: 'State Tax',
            percentage: '5.0',
            tax_type: 'state',
            inclusion_type: 'additive',
            is_active: true,
            concession_items_count: 0,
            ticket_types_count: 0,
          },
          {
            id: 2,
            name: 'Local Tax',
            percentage: '1.0',
            tax_type: 'local',
            inclusion_type: 'additive',
            is_active: true,
            concession_items_count: 0,
            ticket_types_count: 0,
          },
          {
            id: 3,
            name: 'County Tax',
            percentage: '2.0',
            tax_type: 'county',
            inclusion_type: 'additive',
            is_active: true,
            concession_items_count: 0,
            ticket_types_count: 0,
          },
          {
            id: 4,
            name: 'City Tax',
            percentage: '1.5',
            tax_type: 'city',
            inclusion_type: 'additive',
            is_active: true,
            concession_items_count: 0,
            ticket_types_count: 0,
          },
          {
            id: 5,
            name: 'Other Tax',
            percentage: '3.0',
            tax_type: 'other',
            inclusion_type: 'additive',
            is_active: true,
            concession_items_count: 0,
            ticket_types_count: 0,
          },
        ],
      }

      cy.intercept('GET', '/api/v1/sales-taxes/*', {
        statusCode: 200,
        body: salesTaxesWithTypes,
      }).as('getSalesTaxes')

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Check for different type badges
      cy.contains('State').should('be.visible')
      cy.contains('Local').should('be.visible')
      cy.contains('County').should('be.visible')
      cy.contains('City').should('be.visible')
      cy.contains('Other').should('be.visible')
    })
  })

  describe('Responsive Design', () => {
    it('should display mobile card view on small screens', () => {
      cy.viewport(375, 667) // Mobile viewport

      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Sales taxes should be visible in card format
      cy.contains('Maine State Tax').should('be.visible')
      cy.contains('Portland City Tax').should('be.visible')
      cy.contains('5.5%').should('be.visible')
    })

    it('should display desktop table view on large screens', () => {
      cy.viewport(1280, 720) // Desktop viewport

      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')
      cy.wait('@getSalesTaxes')

      // Table headers should be visible
      cy.contains('th', 'Name').should('be.visible')
      cy.contains('th', 'Rate').should('be.visible')
      cy.contains('th', 'Type').should('be.visible')
      cy.contains('th', 'Application').should('be.visible')
      cy.contains('th', 'Status').should('be.visible')
      cy.contains('th', 'Usage').should('be.visible')
      cy.contains('th', 'Actions').should('be.visible')
    })
  })

  describe('Form Validation Edge Cases', () => {
    it('should handle decimal percentage values', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')

        const newTax = {
          id: 3,
          name: 'Decimal Tax',
          percentage: '5.75',
          tax_type: 'state',
          inclusion_type: 'additive',
          is_active: true,
          concession_items_count: 0,
          ticket_types_count: 0,
        }

        cy.intercept('POST', '/api/v1/sales-taxes/', {
          statusCode: 201,
          body: newTax,
        }).as('createSalesTax')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Sales Tax').click()

      // Fill out form with decimal percentage
      cy.get('input[placeholder*="Maine"]').type('Decimal Tax')
      cy.get('input[placeholder*="5.5"]').type('5.75')

      // Submit form
      cy.contains('button', 'Create Sales Tax').click()

      // Wait for API call
      cy.wait('@createSalesTax')
    })

    it('should handle whole number percentage values', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')

        const newTax = {
          id: 3,
          name: 'Whole Tax',
          percentage: '10',
          tax_type: 'state',
          inclusion_type: 'additive',
          is_active: true,
          concession_items_count: 0,
          ticket_types_count: 0,
        }

        cy.intercept('POST', '/api/v1/sales-taxes/', {
          statusCode: 201,
          body: newTax,
        }).as('createSalesTax')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Sales Tax').click()

      // Fill out form with whole number
      cy.get('input[placeholder*="Maine"]').type('Whole Tax')
      cy.get('input[placeholder*="5.5"]').type('10')

      // Submit form
      cy.contains('button', 'Create Sales Tax').click()

      // Wait for API call
      cy.wait('@createSalesTax')
    })

    it('should handle long tax names', () => {
      cy.fixture('sales-taxes').then((salesTaxes) => {
        cy.intercept('GET', '/api/v1/sales-taxes/*', {
          statusCode: 200,
          body: salesTaxes,
        }).as('getSalesTaxes')

        const newTax = {
          id: 3,
          name: 'Very Long Tax Name for Municipal Entertainment and Hospitality Services',
          percentage: '2.5',
          tax_type: 'city',
          inclusion_type: 'additive',
          is_active: true,
          concession_items_count: 0,
          ticket_types_count: 0,
        }

        cy.intercept('POST', '/api/v1/sales-taxes/', {
          statusCode: 201,
          body: newTax,
        }).as('createSalesTax')
      })

      cy.visit('/dashboard/sales-taxes')
      cy.wait('@getCurrentUser')

      // Open create drawer
      cy.contains('button', '+ New Sales Tax').click()

      // Fill out form with long name
      cy.get('input[placeholder*="Maine"]').type('Very Long Tax Name for Municipal Entertainment and Hospitality Services')
      cy.get('input[placeholder*="5.5"]').type('2.5')

      // Submit form
      cy.contains('button', 'Create Sales Tax').click()

      // Wait for API call
      cy.wait('@createSalesTax')
    })
  })
})
