describe('Modifiers Management', () => {
  beforeEach(() => {
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser');
    });

    cy.fixture('modifiers').then((modifiers) => {
      cy.intercept('GET', '/api/v1/modifiers/*', {
        statusCode: 200,
        body: modifiers,
      }).as('getModifiers');
    });
  });

  describe('List View', () => {
    it('should display list of modifiers', () => {
      cy.fixture('modifiers').then((modifiers) => {
        cy.visit('/dashboard/modifiers');
        cy.wait('@getCurrentUser');
        cy.wait('@getModifiers');

        modifiers.results.forEach((modifier) => {
          cy.contains(modifier.name).should('be.visible');
          cy.contains(modifier.price).should('be.visible');
        });
      });
    });

    it('should show modifier categories', () => {
      cy.fixture('modifiers').then((modifiers) => {
        cy.visit('/dashboard/modifiers');
        cy.wait('@getCurrentUser');
        cy.wait('@getModifiers');

        modifiers.results.forEach((modifier) => {
          if (modifier.applies_to) {
            cy.contains(modifier.applies_to).should('be.visible');
          }
        });
      });
    });

    it('should show empty state when no modifiers exist', () => {
      cy.intercept('GET', '/api/v1/modifiers/*', {
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
    it('should create new modifier', () => {
      const newModifier = {
        name: 'Extra Cheese',
        price: '1.00',
        description: 'Add extra cheese',
        applies_to: 'snacks',
        is_active: true,
      };

      cy.intercept('POST', '/api/v1/modifiers/', (req) => {
        expect(req.body.name).to.eq(newModifier.name);
        expect(req.body.price).to.eq(newModifier.price);

        req.reply({
          statusCode: 201,
          body: {
            id: 3,
            ...newModifier,
          },
        });
      }).as('createModifier');

      cy.visit('/dashboard/modifiers');
      cy.wait('@getCurrentUser');
      cy.wait('@getModifiers');

      cy.contains('button', /add|create|new/i).click();

      cy.get('input[name="name"]').type(newModifier.name);
      cy.get('input[name="price"]').type(newModifier.price);
      cy.get('textarea[name="description"]').type(newModifier.description);
      cy.get('select[name="applies_to"]').select(newModifier.applies_to);

      cy.contains('button', /save|submit|create/i).click();

      cy.wait('@createModifier');

      cy.contains(/success|created/i).should('be.visible');
    });

    it('should validate required fields', () => {
      cy.visit('/dashboard/modifiers');
      cy.wait('@getCurrentUser');
      cy.wait('@getModifiers');

      cy.contains('button', /add|create|new/i).click();
      cy.contains('button', /save|submit|create/i).click();

      cy.contains(/required/i).should('be.visible');
    });

    it('should allow zero price for free modifiers', () => {
      const freeModifier = {
        name: 'Light Ice',
        price: '0.00',
        description: 'Light ice option',
        applies_to: 'beverages',
        is_active: true,
      };

      cy.intercept('POST', '/api/v1/modifiers/', {
        statusCode: 201,
        body: { id: 3, ...freeModifier },
      }).as('createFreeModifier');

      cy.visit('/dashboard/modifiers');
      cy.wait('@getCurrentUser');
      cy.wait('@getModifiers');

      cy.contains('button', /add|create|new/i).click();

      cy.get('input[name="name"]').type(freeModifier.name);
      cy.get('input[name="price"]').type(freeModifier.price);
      cy.get('textarea[name="description"]').type(freeModifier.description);
      cy.get('select[name="applies_to"]').select(freeModifier.applies_to);

      cy.contains('button', /save|submit|create/i).click();

      cy.wait('@createFreeModifier');

      cy.contains(/success|created/i).should('be.visible');
    });
  });

  describe('Update Modifier', () => {
    it('should update modifier', () => {
      cy.fixture('modifiers').then((modifiers) => {
        const modifier = modifiers.results[0];
        const updatedPrice = '0.75';

        cy.intercept('PATCH', `/api/v1/modifiers/${modifier.id}/`, (req) => {
          req.reply({
            statusCode: 200,
            body: {
              ...modifier,
              price: req.body.price,
            },
          });
        }).as('updateModifier');

        cy.visit('/dashboard/modifiers');
        cy.wait('@getCurrentUser');
        cy.wait('@getModifiers');

        cy.contains(modifier.name)
          .parent()
          .within(() => {
            cy.contains('button', /edit/i).click();
          });

        cy.get('input[name="price"]').clear().type(updatedPrice);

        cy.contains('button', /save|update/i).click();

        cy.wait('@updateModifier');

        cy.contains(/success|updated/i).should('be.visible');
      });
    });

    it('should change applies_to category', () => {
      cy.fixture('modifiers').then((modifiers) => {
        const modifier = modifiers.results[0];

        cy.intercept('PATCH', `/api/v1/modifiers/${modifier.id}/`, (req) => {
          req.reply({
            statusCode: 200,
            body: {
              ...modifier,
              applies_to: req.body.applies_to,
            },
          });
        }).as('updateModifier');

        cy.visit('/dashboard/modifiers');
        cy.wait('@getCurrentUser');
        cy.wait('@getModifiers');

        cy.contains(modifier.name)
          .parent()
          .within(() => {
            cy.contains('button', /edit/i).click();
          });

        cy.get('select[name="applies_to"]').select('beverages');

        cy.contains('button', /save|update/i).click();

        cy.wait('@updateModifier').then((interception) => {
          expect(interception.request.body.applies_to).to.eq('beverages');
        });
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

        cy.contains(modifier.name)
          .parent()
          .within(() => {
            cy.contains('button', /delete/i).click();
          });

        cy.contains('button', /confirm|yes|delete/i).click();

        cy.wait('@deleteModifier');

        cy.contains(modifier.name).should('not.exist');
      });
    });

    it('should cancel deletion', () => {
      cy.fixture('modifiers').then((modifiers) => {
        const modifier = modifiers.results[0];

        cy.visit('/dashboard/modifiers');
        cy.wait('@getCurrentUser');
        cy.wait('@getModifiers');

        cy.contains(modifier.name)
          .parent()
          .within(() => {
            cy.contains('button', /delete/i).click();
          });

        cy.contains('button', /cancel|no/i).click();

        cy.contains(modifier.name).should('be.visible');
      });
    });
  });

  describe('Filter by Category', () => {
    it('should filter modifiers by applies_to category', () => {
      cy.fixture('modifiers').then((modifiers) => {
        const snacksModifiers = modifiers.results.filter((m) => m.applies_to === 'snacks');

        cy.intercept('GET', '/api/v1/modifiers/*applies_to=snacks*', {
          statusCode: 200,
          body: { count: snacksModifiers.length, results: snacksModifiers },
        }).as('getSnacksModifiers');

        cy.visit('/dashboard/modifiers');
        cy.wait('@getCurrentUser');
        cy.wait('@getModifiers');

        cy.get('select[name="filter_category"]').select('snacks');

        cy.wait('@getSnacksModifiers');

        cy.contains('Extra Butter').should('be.visible');
        cy.contains('Large Size Upgrade').should('not.exist');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should display modifiers on mobile', () => {
      cy.viewport(375, 667);

      cy.fixture('modifiers').then((modifiers) => {
        cy.visit('/dashboard/modifiers');
        cy.wait('@getCurrentUser');
        cy.wait('@getModifiers');

        modifiers.results.forEach((modifier) => {
          cy.contains(modifier.name).should('be.visible');
        });
      });
    });

    it('should display modifiers table on desktop', () => {
      cy.viewport(1280, 720);

      cy.fixture('modifiers').then((modifiers) => {
        cy.visit('/dashboard/modifiers');
        cy.wait('@getCurrentUser');
        cy.wait('@getModifiers');

        cy.get('table').should('be.visible');
        modifiers.results.forEach((modifier) => {
          cy.contains(modifier.name).should('be.visible');
        });
      });
    });
  });
});
