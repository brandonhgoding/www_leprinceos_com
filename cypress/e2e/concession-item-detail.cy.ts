describe('Concession Item Detail', () => {
  beforeEach(() => {
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser');
    });

    cy.fixture('concession-item-detail').then((item) => {
      cy.intercept('GET', /\/api\/v1\/concession-items\/\d+\//, {
        statusCode: 200,
        body: item,
      }).as('getItem');
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

  describe('Item Details', () => {
    it('should display item with modifiers listed', () => {
      cy.visit('/dashboard/concessions/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getItem');

      cy.contains('h1', 'Popcorn').should('be.visible');
      cy.contains('Butter').should('be.visible');
    });
  });

  describe('Edit Item Modifiers', () => {
    it('should show modifier checkboxes pre-populated in edit form', () => {
      cy.visit('/dashboard/concessions/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getItem');
      cy.wait('@getModifiers');

      // Click the Edit button in the Item Details card
      cy.contains('h2', 'Item Details')
        .parent()
        .within(() => {
          cy.contains('button', 'Edit').click();
        });

      // In the drawer, Butter should be checked (it's in item.modifiers)
      cy.get('[data-cy="drawer"]').within(() => {
        cy.contains('label', 'Butter').find('input[type="checkbox"]').should('be.checked');
        // Toppings should NOT be checked (not in item.modifiers)
        cy.contains('label', 'Toppings').find('input[type="checkbox"]').should('not.be.checked');
      });
    });

    it('should update modifier_ids when saving', () => {
      cy.visit('/dashboard/concessions/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getItem');
      cy.wait('@getModifiers');

      cy.contains('h2', 'Item Details')
        .parent()
        .within(() => {
          cy.contains('button', 'Edit').click();
        });

      // Check Toppings checkbox (adding it)
      cy.get('[data-cy="drawer"]').within(() => {
        cy.contains('label', 'Toppings').find('input[type="checkbox"]').check();
      });

      cy.fixture('concession-item-detail').then((item) => {
        cy.intercept('PATCH', '/api/v1/concession-items/1/', (req) => {
          expect(req.body.modifier_ids).to.include(1);
          expect(req.body.modifier_ids).to.include(2);
          req.reply({
            statusCode: 200,
            body: { ...item, modifier_ids: [1, 2] },
          });
        }).as('updateItem');
      });

      cy.contains('button', 'Save Changes').click();
      cy.wait('@updateItem');
    });

    it('should remove modifier_ids when unchecking', () => {
      cy.visit('/dashboard/concessions/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getItem');
      cy.wait('@getModifiers');

      cy.contains('h2', 'Item Details')
        .parent()
        .within(() => {
          cy.contains('button', 'Edit').click();
        });

      // Uncheck Butter checkbox (removing it)
      cy.get('[data-cy="drawer"]').within(() => {
        cy.contains('label', 'Butter').find('input[type="checkbox"]').uncheck();
      });

      cy.fixture('concession-item-detail').then((item) => {
        cy.intercept('PATCH', '/api/v1/concession-items/1/', (req) => {
          expect(req.body.modifier_ids).to.deep.equal([]);
          req.reply({
            statusCode: 200,
            body: { ...item, modifiers: [], modifier_ids: [] },
          });
        }).as('updateItem');
      });

      cy.contains('button', 'Save Changes').click();
      cy.wait('@updateItem');
    });
  });

  describe('Modifier Pricing by Variation', () => {
    it('should display pricing matrix with variations as rows and options as columns', () => {
      cy.visit('/dashboard/concessions/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getItem');

      cy.contains('h2', 'Modifier Pricing by Variation').should('be.visible');
      cy.contains('h3', 'Butter').should('be.visible');

      // Check column headers for option names
      cy.contains('h3', 'Butter')
        .closest('div')
        .within(() => {
          cy.get('thead th').should('have.length', 4); // Variation + None + Regular + Extra
          cy.get('thead th').eq(1).should('contain', 'None');
          cy.get('thead th').eq(2).should('contain', 'Regular');
          cy.get('thead th').eq(3).should('contain', 'Extra');

          // Check variation name rows
          cy.get('tbody tr').should('have.length', 3);
          cy.get('tbody tr').eq(0).should('contain', 'Small');
          cy.get('tbody tr').eq(1).should('contain', 'Medium');
          cy.get('tbody tr').eq(2).should('contain', 'Large');
        });
    });

    it('should show existing variation price overrides', () => {
      cy.visit('/dashboard/concessions/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getItem');

      // The Extra option (column index 3) for Large variation (row index 2) has price override 0.75
      cy.contains('h3', 'Butter')
        .closest('div')
        .within(() => {
          cy.get('tbody tr')
            .eq(2) // Large row
            .find('input')
            .eq(2) // Extra column (3rd input, after None and Regular)
            .should('have.value', '0.75');
        });
    });

    it('should save modifier variation prices', () => {
      cy.visit('/dashboard/concessions/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getItem');

      // Type a price in Small row, Extra column
      cy.contains('h3', 'Butter')
        .closest('div')
        .within(() => {
          cy.get('tbody tr')
            .eq(0) // Small row
            .find('input')
            .eq(2) // Extra column
            .clear()
            .type('0.25');
        });

      cy.fixture('concession-item-detail').then((item) => {
        cy.intercept('PATCH', '/api/v1/concession-items/1/', (req) => {
          expect(req.body.modifier_variation_prices).to.be.an('array');
          const smallExtraEntry = req.body.modifier_variation_prices.find(
            (p: { modifier_option_id: number; variation_id: number }) =>
              p.modifier_option_id === 3 && p.variation_id === 1,
          );
          expect(smallExtraEntry).to.exist;
          expect(smallExtraEntry.price_adjustment).to.eq('0.25');
          req.reply({
            statusCode: 200,
            body: item,
          });
        }).as('savePrices');
      });

      cy.contains('button', 'Save Prices').click();
      cy.wait('@savePrices');
    });

    it('should not show pricing matrix when item has no modifiers', () => {
      cy.fixture('concession-item-detail').then((item) => {
        cy.intercept('GET', /\/api\/v1\/concession-items\/\d+\//, {
          statusCode: 200,
          body: { ...item, modifiers: [] },
        }).as('getItemNoModifiers');
      });

      cy.visit('/dashboard/concessions/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getItemNoModifiers');

      cy.contains('Modifier Pricing by Variation').should('not.exist');
    });

    it('should not show pricing matrix when item has only one variation', () => {
      cy.fixture('concession-item-detail').then((item) => {
        cy.intercept('GET', /\/api\/v1\/concession-items\/\d+\//, {
          statusCode: 200,
          body: { ...item, variations: [item.variations[0]] },
        }).as('getItemOneVariation');
      });

      cy.visit('/dashboard/concessions/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getItemOneVariation');

      cy.contains('Modifier Pricing by Variation').should('not.exist');
    });
  });
});
