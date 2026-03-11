describe('Concession Items - Modifier Assignment', () => {
  beforeEach(() => {
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser');
    });

    cy.fixture('concessions').then((concessions) => {
      cy.intercept('GET', /\/api\/v1\/concession-items\/(\?.*)?$/, {
        statusCode: 200,
        body: concessions,
      }).as('getItems');
    });

    cy.fixture('concession-categories').then((categories) => {
      cy.intercept('GET', /\/api\/v1\/concession-categories\/(\?.*)?$/, {
        statusCode: 200,
        body: categories,
      }).as('getCategories');
    });

    cy.fixture('modifiers').then((modifiers) => {
      cy.intercept('GET', /\/api\/v1\/modifiers\/(\?.*)?$/, {
        statusCode: 200,
        body: modifiers,
      }).as('getModifiers');
    });

    cy.fixture('sales-taxes').then((taxes) => {
      cy.intercept('GET', /\/api\/v1\/sales-taxes\/(\?.*)?$/, {
        statusCode: 200,
        body: taxes,
      }).as('getSalesTaxes');
    });
  });

  describe('Modifier Assignment', () => {
    it('should show modifier checkboxes in create item form', () => {
      cy.visit('/dashboard/concessions');
      cy.wait('@getCurrentUser');
      cy.wait('@getCategories');

      cy.contains('button', 'Items').click();
      cy.wait('@getItems');

      cy.contains('button', '+ New Item').click();

      cy.get('[data-cy="drawer"]').within(() => {
        cy.contains('Modifiers').should('be.visible');
        cy.contains('Butter').should('be.visible');
        cy.contains('Toppings').should('be.visible');
      });
    });

    it('should include modifier_ids when creating an item', () => {
      cy.intercept('POST', '/api/v1/concession-items/', (req) => {
        expect(req.body.modifier_ids).to.include(1);

        req.reply({
          statusCode: 201,
          body: {
            id: 4,
            category: 1,
            category_name: 'Snacks',
            name: 'Nachos',
            description: '',
            image: null,
            price: '7.00',
            taxes: [],
            is_active: true,
            variations: [],
            modifiers: [
              {
                id: 1,
                name: 'Butter',
                is_required: false,
                max_selections: 1,
                display_order: 0,
                options: [],
                created_at: '2026-03-11T10:00:00Z',
                updated_at: '2026-03-11T10:00:00Z',
              },
            ],
            created_at: '2026-03-11T10:00:00Z',
            updated_at: '2026-03-11T10:00:00Z',
          },
        });
      }).as('createItem');

      cy.visit('/dashboard/concessions');
      cy.wait('@getCurrentUser');
      cy.wait('@getCategories');

      cy.contains('button', 'Items').click();
      cy.wait('@getItems');

      cy.contains('button', '+ New Item').click();

      cy.get('#item-name').type('Nachos');
      cy.get('#item-category').select('1');
      cy.get('#item-price').type('7.00');

      // Check the Butter modifier checkbox
      cy.get('[data-cy="drawer"]').within(() => {
        cy.contains('Butter').click();
      });

      cy.contains('button', 'Create Item').click();
      cy.wait('@createItem');
    });

    it('should show empty state when no modifiers exist', () => {
      cy.intercept('GET', /\/api\/v1\/modifiers\/(\?.*)?$/, {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptyModifiers');

      cy.visit('/dashboard/concessions');
      cy.wait('@getCurrentUser');
      cy.wait('@getCategories');

      cy.contains('button', 'Items').click();
      cy.wait('@getItems');

      cy.contains('button', '+ New Item').click();

      cy.get('[data-cy="drawer"]').within(() => {
        cy.contains('No modifiers created yet.').should('be.visible');
      });
    });
  });
});
