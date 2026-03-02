describe('Tickets Management', () => {
  beforeEach(() => {
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser');
    });

    cy.fixture('tickets').then((tickets) => {
      cy.intercept('GET', '/api/v1/tickets/*', {
        statusCode: 200,
        body: tickets,
      }).as('getTickets');
    });
  });

  describe('List View', () => {
    it('should display list of ticket types', () => {
      cy.fixture('tickets').then((tickets) => {
        cy.visit('/dashboard/tickets');
        cy.wait('@getCurrentUser');
        cy.wait('@getTickets');

        tickets.results.forEach((ticket) => {
          cy.contains(ticket.name).should('be.visible');
          cy.contains(ticket.price).should('be.visible');
        });
      });
    });

    it('should show ticket descriptions', () => {
      cy.fixture('tickets').then((tickets) => {
        cy.visit('/dashboard/tickets');
        cy.wait('@getCurrentUser');
        cy.wait('@getTickets');

        const ticket = tickets.results[0];
        cy.contains(ticket.description).should('be.visible');
      });
    });

    it('should show empty state when no tickets exist', () => {
      cy.intercept('GET', '/api/v1/tickets/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptyTickets');

      cy.visit('/dashboard/tickets');
      cy.wait('@getCurrentUser');
      cy.wait('@getEmptyTickets');

      cy.contains(/no tickets/i).should('be.visible');
    });
  });

  describe('Create Ticket', () => {
    it('should create new ticket type', () => {
      const newTicket = {
        name: 'Student',
        price: '8.00',
        description: 'Student discount with valid ID',
        is_active: true,
      };

      cy.intercept('POST', '/api/v1/tickets/', (req) => {
        expect(req.body.name).to.eq(newTicket.name);
        expect(req.body.price).to.eq(newTicket.price);

        req.reply({
          statusCode: 201,
          body: {
            id: 3,
            ...newTicket,
            cinema: 1,
          },
        });
      }).as('createTicket');

      cy.visit('/dashboard/tickets');
      cy.wait('@getCurrentUser');
      cy.wait('@getTickets');

      cy.contains('button', /add|create|new/i).click();

      cy.get('input[name="name"]').type(newTicket.name);
      cy.get('input[name="price"]').type(newTicket.price);
      cy.get('textarea[name="description"]').type(newTicket.description);

      cy.contains('button', /save|submit|create/i).click();

      cy.wait('@createTicket');

      cy.contains(/success|created/i).should('be.visible');
    });

    it('should validate required fields', () => {
      cy.visit('/dashboard/tickets');
      cy.wait('@getCurrentUser');
      cy.wait('@getTickets');

      cy.contains('button', /add|create|new/i).click();
      cy.contains('button', /save|submit|create/i).click();

      cy.contains(/required/i).should('be.visible');
    });

    it('should validate price format', () => {
      cy.visit('/dashboard/tickets');
      cy.wait('@getCurrentUser');
      cy.wait('@getTickets');

      cy.contains('button', /add|create|new/i).click();

      cy.get('input[name="name"]').type('Test Ticket');
      cy.get('input[name="price"]').type('invalid');

      cy.contains('button', /save|submit|create/i).click();

      cy.contains(/price|number|decimal/i).should('be.visible');
    });
  });

  describe('Update Ticket', () => {
    it('should update ticket type', () => {
      cy.fixture('tickets').then((tickets) => {
        const ticket = tickets.results[0];
        const updatedPrice = '13.00';

        cy.intercept('PATCH', `/api/v1/tickets/${ticket.id}/`, (req) => {
          req.reply({
            statusCode: 200,
            body: {
              ...ticket,
              price: req.body.price,
            },
          });
        }).as('updateTicket');

        cy.visit('/dashboard/tickets');
        cy.wait('@getCurrentUser');
        cy.wait('@getTickets');

        cy.contains(ticket.name)
          .parent()
          .within(() => {
            cy.contains('button', /edit/i).click();
          });

        cy.get('input[name="price"]').clear().type(updatedPrice);

        cy.contains('button', /save|update/i).click();

        cy.wait('@updateTicket');

        cy.contains(/success|updated/i).should('be.visible');
      });
    });
  });

  describe('Delete Ticket', () => {
    it('should delete ticket after confirmation', () => {
      cy.fixture('tickets').then((tickets) => {
        const ticket = tickets.results[1];

        cy.intercept('DELETE', `/api/v1/tickets/${ticket.id}/`, {
          statusCode: 204,
        }).as('deleteTicket');

        cy.visit('/dashboard/tickets');
        cy.wait('@getCurrentUser');
        cy.wait('@getTickets');

        cy.contains(ticket.name)
          .parent()
          .within(() => {
            cy.contains('button', /delete/i).click();
          });

        cy.contains('button', /confirm|yes|delete/i).click();

        cy.wait('@deleteTicket');

        cy.contains(ticket.name).should('not.exist');
      });
    });
  });

  describe('Ticket Detail Page', () => {
    it('should navigate to ticket detail page', () => {
      cy.fixture('tickets').then((tickets) => {
        const ticket = tickets.results[0];

        cy.intercept('GET', `/api/v1/tickets/${ticket.id}/`, {
          statusCode: 200,
          body: ticket,
        }).as('getTicket');

        cy.visit('/dashboard/tickets');
        cy.wait('@getCurrentUser');
        cy.wait('@getTickets');

        cy.contains(ticket.name).click();

        cy.wait('@getTicket');
        cy.url().should('include', `/dashboard/tickets/${ticket.id}`);
      });
    });

    it('should display ticket details', () => {
      cy.fixture('tickets').then((tickets) => {
        const ticket = tickets.results[0];

        cy.intercept('GET', `/api/v1/tickets/${ticket.id}/`, {
          statusCode: 200,
          body: ticket,
        }).as('getTicket');

        cy.visit(`/dashboard/tickets/${ticket.id}`);
        cy.wait('@getCurrentUser');
        cy.wait('@getTicket');

        cy.contains(ticket.name).should('be.visible');
        cy.contains(ticket.price).should('be.visible');
        cy.contains(ticket.description).should('be.visible');
      });
    });
  });
});
