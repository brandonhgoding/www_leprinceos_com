describe('Modifiers Management', () => {
  beforeEach(() => {
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser');
    });

    cy.fixture('modifiers').then((modifiers) => {
      cy.intercept('GET', /\/api\/v1\/modifiers\/(\?.*)?$/, {
        statusCode: 200,
        body: modifiers,
      }).as('getModifiers');
    });
  });

  describe('List View', () => {
    it('should display list of modifiers', () => {
      cy.visit('/dashboard/modifiers');
      cy.wait('@getCurrentUser');
      cy.wait('@getModifiers');

      cy.contains('Butter').should('be.visible');
      cy.contains('Toppings').should('be.visible');
    });

    it('should show options for each modifier', () => {
      cy.visit('/dashboard/modifiers');
      cy.wait('@getCurrentUser');
      cy.wait('@getModifiers');

      cy.contains('None, Regular, Extra').should('be.visible');
      cy.contains('Salt, Cheese').should('be.visible');
    });

    it('should show required badge', () => {
      cy.visit('/dashboard/modifiers');
      cy.wait('@getCurrentUser');
      cy.wait('@getModifiers');

      cy.get('table').within(() => {
        cy.contains('No').should('be.visible');
      });
    });

    it('should show max selections', () => {
      cy.visit('/dashboard/modifiers');
      cy.wait('@getCurrentUser');
      cy.wait('@getModifiers');

      cy.get('table').within(() => {
        cy.contains('1').should('be.visible');
        cy.contains('Unlimited').should('be.visible');
      });
    });

    it('should show empty state when no modifiers exist', () => {
      cy.intercept('GET', /\/api\/v1\/modifiers\/(\?.*)?$/, {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptyModifiers');

      cy.visit('/dashboard/modifiers');
      cy.wait('@getCurrentUser');
      cy.wait('@getEmptyModifiers');

      cy.contains(/no modifiers/i).should('be.visible');
    });
  });

  describe('Create Modifier', () => {
    it('should open drawer and create a modifier with options', () => {
      cy.intercept('POST', '/api/v1/modifiers/', (req) => {
        expect(req.body.name).to.eq('Size');
        expect(req.body.options).to.have.length(2);
        expect(req.body.options[0].name).to.eq('Regular');
        expect(req.body.options[1].name).to.eq('Large');
        expect(req.body.options[1].price_adjustment).to.eq('1.50');

        req.reply({
          statusCode: 201,
          body: {
            id: 3,
            name: 'Size',
            is_required: true,
            max_selections: 1,
            display_order: 0,
            options: [
              {
                id: 6,
                name: 'Regular',
                price_adjustment: '0.00',
                is_default: true,
                display_order: 0,
                variation_prices: [],
              },
              {
                id: 7,
                name: 'Large',
                price_adjustment: '1.50',
                is_default: false,
                display_order: 1,
                variation_prices: [],
              },
            ],
            created_at: '2026-03-11T10:00:00Z',
            updated_at: '2026-03-11T10:00:00Z',
          },
        });
      }).as('createModifier');

      cy.visit('/dashboard/modifiers');
      cy.wait('@getCurrentUser');
      cy.wait('@getModifiers');

      cy.contains('button', '+ New Modifier').click();

      // Fill group fields
      cy.get('#modifier-name').type('Size');
      cy.get('#modifier-max-selections').clear().type('1');
      cy.get('[data-cy="drawer"]').within(() => {
        // Check "Required"
        cy.contains('Required').click();
      });

      // First option row exists by default - fill it
      cy.get('[data-cy="drawer"]').within(() => {
        cy.get('input[placeholder="Option name"]').first().type('Regular');
      });

      // Add second option
      cy.contains('button', '+ Add Option').click();
      cy.get('[data-cy="drawer"]').within(() => {
        cy.get('input[placeholder="Option name"]').last().type('Large');
        cy.get('input[placeholder="0.00"]').last().clear().type('1.50');
      });

      cy.contains('button', 'Create Modifier').click();
      cy.wait('@createModifier');

      cy.contains(/created successfully/i).should('be.visible');
    });
  });

  describe('Edit Modifier', () => {
    it('should open drawer with existing data and update', () => {
      cy.fixture('modifiers').then((modifiers) => {
        const modifier = modifiers.results[0];

        cy.intercept('PATCH', `/api/v1/modifiers/${modifier.id}/`, (req) => {
          req.reply({
            statusCode: 200,
            body: { ...modifier, ...req.body },
          });
        }).as('updateModifier');

        cy.visit('/dashboard/modifiers');
        cy.wait('@getCurrentUser');
        cy.wait('@getModifiers');

        cy.contains('Butter')
          .closest('tr')
          .within(() => {
            cy.contains('button', 'Edit').click();
          });

        // Verify form is populated
        cy.get('#modifier-name').should('have.value', 'Butter');

        // Change name
        cy.get('#modifier-name').clear().type('Buttered');

        cy.contains('button', 'Save Changes').click();
        cy.wait('@updateModifier');

        cy.contains(/updated successfully/i).should('be.visible');
      });
    });
  });

  describe('Delete Modifier', () => {
    it('should delete modifier after confirmation', () => {
      cy.fixture('modifiers').then((modifiers) => {
        const modifier = modifiers.results[1];

        cy.intercept('DELETE', `/api/v1/modifiers/${modifier.id}/`, {
          statusCode: 204,
        }).as('deleteModifier');

        cy.visit('/dashboard/modifiers');
        cy.wait('@getCurrentUser');
        cy.wait('@getModifiers');

        cy.contains('Toppings')
          .closest('tr')
          .within(() => {
            cy.contains('button', 'Delete').click();
          });

        // Confirm dialog
        cy.get('[data-confirm-ok]').click();

        cy.wait('@deleteModifier');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should show cards on mobile instead of table', () => {
      cy.viewport(375, 667);

      cy.visit('/dashboard/modifiers');
      cy.wait('@getCurrentUser');
      cy.wait('@getModifiers');

      cy.get('table').should('not.be.visible');
      // Use :visible filter to avoid matching hidden table content
      cy.contains(':visible', 'Butter').should('exist');
      cy.contains(':visible', 'Toppings').should('exist');
    });

    it('should show table on desktop', () => {
      cy.viewport(1280, 720);

      cy.visit('/dashboard/modifiers');
      cy.wait('@getCurrentUser');
      cy.wait('@getModifiers');

      cy.get('table').should('be.visible');
    });
  });
});
