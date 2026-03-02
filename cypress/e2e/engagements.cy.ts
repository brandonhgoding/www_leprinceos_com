describe('Engagements CRUD Operations', () => {
  beforeEach(() => {
    // Set up authenticated session
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser');
    });

    // Load engagements fixture
    cy.fixture('engagements').then((engagements) => {
      cy.intercept('GET', '/api/v1/engagements/*', {
        statusCode: 200,
        body: engagements,
      }).as('getEngagements');
    });
  });

  describe('List View', () => {
    it('should display list of engagements', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.visit('/dashboard/engagements');
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagements');

        // Verify engagements are displayed
        engagements.results.forEach((engagement) => {
          cy.contains(engagement.film.title).should('be.visible');
        });
      });
    });

    it('should show engagement details in list', () => {
      cy.fixture('engagements').then((engagements) => {
        cy.visit('/dashboard/engagements');
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagements');

        const firstEngagement = engagements.results[0];

        // Check for film title
        cy.contains(firstEngagement.film.title).should('be.visible');

        // Check for dates (format may vary)
        cy.contains(firstEngagement.start_date).should('exist');
        cy.contains(firstEngagement.end_date).should('exist');
      });
    });

    it('should show empty state when no engagements exist', () => {
      cy.intercept('GET', '/api/v1/engagements/*', {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptyEngagements');

      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEmptyEngagements');

      // Should show empty state message
      cy.contains(/no engagements/i).should('be.visible');
    });

    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '/api/v1/engagements/*', {
        statusCode: 500,
        body: { detail: 'Internal server error' },
      }).as('getEngagementsError');

      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagementsError');

      // Should show error message
      cy.contains(/error/i).should('be.visible');
    });
  });

  describe('Detail View', () => {
    it('should navigate to engagement detail page', () => {
      cy.fixture('engagements').then((engagements) => {
        const engagement = engagements.results[0];

        cy.intercept('GET', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 200,
          body: engagement,
        }).as('getEngagement');

        cy.visit('/dashboard/engagements');
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagements');

        // Click on engagement to view details
        cy.contains(engagement.film.title).click();

        cy.wait('@getEngagement');
        cy.url().should('include', `/dashboard/engagements/${engagement.id}`);
      });
    });

    it('should display engagement details', () => {
      cy.fixture('engagements').then((engagements) => {
        const engagement = engagements.results[0];

        cy.intercept('GET', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 200,
          body: engagement,
        }).as('getEngagement');

        cy.visit(`/dashboard/engagements/${engagement.id}`);
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagement');

        // Verify details are shown
        cy.contains(engagement.film.title).should('be.visible');
        cy.contains(engagement.start_date).should('exist');
        cy.contains(engagement.end_date).should('exist');

        if (engagement.notes) {
          cy.contains(engagement.notes).should('be.visible');
        }
      });
    });

    it('should handle non-existent engagement', () => {
      cy.intercept('GET', '/api/v1/engagements/99999/', {
        statusCode: 404,
        body: { detail: 'Not found.' },
      }).as('getEngagement404');

      cy.visit('/dashboard/engagements/99999', { failOnStatusCode: false });
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement404');

      // Should show error or not found message
      cy.contains(/not found/i).should('be.visible');
    });
  });

  describe('Create Engagement', () => {
    it('should open create form when clicking add button', () => {
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      // Look for Add/Create button
      cy.contains('button', /add|create|new/i).click();

      // Form drawer should open
      // Adjust selector based on actual implementation
      cy.get('[role="dialog"]').should('be.visible').or(cy.get('.drawer').should('be.visible'));
    });

    it('should create new engagement with valid data', () => {
      const newEngagement = {
        film_id: 3,
        start_date: '2024-03-01',
        end_date: '2024-03-15',
        notes: 'Special premiere screening',
      };

      cy.intercept('POST', '/api/v1/engagements/', (req) => {
        expect(req.body).to.include({
          film_id: newEngagement.film_id,
          start_date: newEngagement.start_date,
          end_date: newEngagement.end_date,
        });

        req.reply({
          statusCode: 201,
          body: {
            id: 3,
            ...newEngagement,
            film: {
              id: 3,
              title: 'New Film',
              tmdb_id: 11111,
            },
            cinema: 1,
            is_active: true,
          },
        });
      }).as('createEngagement');

      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      cy.contains('button', /add|create|new/i).click();

      // Fill in form fields
      // Adjust selectors based on actual form implementation
      cy.get('input[name="film_id"]').type(String(newEngagement.film_id));
      cy.get('input[name="start_date"]').type(newEngagement.start_date);
      cy.get('input[name="end_date"]').type(newEngagement.end_date);
      cy.get('textarea[name="notes"]').type(newEngagement.notes);

      // Submit form
      cy.contains('button', /save|submit|create/i).click();

      cy.wait('@createEngagement');

      // Should close form and show success message
      cy.contains(/success|created/i).should('be.visible');
    });

    it('should validate required fields', () => {
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      cy.contains('button', /add|create|new/i).click();

      // Try to submit without filling required fields
      cy.contains('button', /save|submit|create/i).click();

      // Should show validation errors
      cy.contains(/required/i).should('be.visible');
    });

    it('should validate date range', () => {
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      cy.contains('button', /add|create|new/i).click();

      // Enter end date before start date
      cy.get('input[name="start_date"]').type('2024-03-15');
      cy.get('input[name="end_date"]').type('2024-03-01');

      cy.contains('button', /save|submit|create/i).click();

      // Should show validation error
      cy.contains(/end date.*after.*start date/i).should('be.visible');
    });

    it('should handle API errors during creation', () => {
      cy.intercept('POST', '/api/v1/engagements/', {
        statusCode: 400,
        body: { detail: 'Invalid data' },
      }).as('createEngagementError');

      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      cy.contains('button', /add|create|new/i).click();

      // Fill minimal valid data
      cy.get('input[name="film_id"]').type('1');
      cy.get('input[name="start_date"]').type('2024-03-01');
      cy.get('input[name="end_date"]').type('2024-03-15');

      cy.contains('button', /save|submit|create/i).click();

      cy.wait('@createEngagementError');

      // Should show error message
      cy.contains(/error/i).should('be.visible');
    });

    it('should cancel creation and close form', () => {
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      cy.contains('button', /add|create|new/i).click();

      // Fill some data
      cy.get('input[name="film_id"]').type('1');

      // Click cancel
      cy.contains('button', /cancel/i).click();

      // Form should close
      cy.get('[role="dialog"]').should('not.exist');
    });
  });

  describe('Update Engagement', () => {
    it('should open edit form for existing engagement', () => {
      cy.fixture('engagements').then((engagements) => {
        const engagement = engagements.results[0];

        cy.intercept('GET', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 200,
          body: engagement,
        }).as('getEngagement');

        cy.visit(`/dashboard/engagements/${engagement.id}`);
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagement');

        // Click edit button
        cy.contains('button', /edit/i).click();

        // Form should open with existing data
        cy.get('input[name="start_date"]').should('have.value', engagement.start_date);
        cy.get('input[name="end_date"]').should('have.value', engagement.end_date);
      });
    });

    it('should update engagement with new data', () => {
      cy.fixture('engagements').then((engagements) => {
        const engagement = engagements.results[0];
        const updatedNotes = 'Updated screening notes';

        cy.intercept('GET', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 200,
          body: engagement,
        }).as('getEngagement');

        cy.intercept('PATCH', `/api/v1/engagements/${engagement.id}/`, (req) => {
          req.reply({
            statusCode: 200,
            body: {
              ...engagement,
              notes: req.body.notes,
            },
          });
        }).as('updateEngagement');

        cy.visit(`/dashboard/engagements/${engagement.id}`);
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagement');

        cy.contains('button', /edit/i).click();

        // Update notes field
        cy.get('textarea[name="notes"]').clear().type(updatedNotes);

        // Save changes
        cy.contains('button', /save|update/i).click();

        cy.wait('@updateEngagement');

        // Should show success message
        cy.contains(/success|updated/i).should('be.visible');
      });
    });

    it('should handle update validation errors', () => {
      cy.fixture('engagements').then((engagements) => {
        const engagement = engagements.results[0];

        cy.intercept('GET', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 200,
          body: engagement,
        }).as('getEngagement');

        cy.intercept('PATCH', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 400,
          body: { detail: 'Validation error' },
        }).as('updateEngagementError');

        cy.visit(`/dashboard/engagements/${engagement.id}`);
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagement');

        cy.contains('button', /edit/i).click();

        // Make invalid change (e.g., swap dates)
        cy.get('input[name="end_date"]').clear().type('2024-01-01');

        cy.contains('button', /save|update/i).click();

        cy.wait('@updateEngagementError');

        // Should show error
        cy.contains(/error/i).should('be.visible');
      });
    });
  });

  describe('Delete Engagement', () => {
    it('should delete engagement after confirmation', () => {
      cy.fixture('engagements').then((engagements) => {
        const engagement = engagements.results[0];

        cy.intercept('GET', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 200,
          body: engagement,
        }).as('getEngagement');

        cy.intercept('DELETE', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 204,
        }).as('deleteEngagement');

        // Mock redirect to list after delete
        cy.intercept('GET', '/api/v1/engagements/*', {
          statusCode: 200,
          body: {
            count: 1,
            results: engagements.results.slice(1),
          },
        }).as('getEngagementsAfterDelete');

        cy.visit(`/dashboard/engagements/${engagement.id}`);
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagement');

        // Click delete button
        cy.contains('button', /delete/i).click();

        // Confirm deletion in modal/dialog
        cy.contains('button', /confirm|yes|delete/i).click();

        cy.wait('@deleteEngagement');

        // Should redirect to list page
        cy.url().should('include', '/dashboard/engagements');
        cy.url().should('not.include', `/${engagement.id}`);
      });
    });

    it('should cancel deletion', () => {
      cy.fixture('engagements').then((engagements) => {
        const engagement = engagements.results[0];

        cy.intercept('GET', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 200,
          body: engagement,
        }).as('getEngagement');

        cy.visit(`/dashboard/engagements/${engagement.id}`);
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagement');

        cy.contains('button', /delete/i).click();

        // Cancel deletion
        cy.contains('button', /cancel|no/i).click();

        // Should stay on detail page
        cy.url().should('include', `/dashboard/engagements/${engagement.id}`);
      });
    });

    it('should handle delete errors', () => {
      cy.fixture('engagements').then((engagements) => {
        const engagement = engagements.results[0];

        cy.intercept('GET', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 200,
          body: engagement,
        }).as('getEngagement');

        cy.intercept('DELETE', `/api/v1/engagements/${engagement.id}/`, {
          statusCode: 500,
          body: { detail: 'Server error' },
        }).as('deleteEngagementError');

        cy.visit(`/dashboard/engagements/${engagement.id}`);
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagement');

        cy.contains('button', /delete/i).click();
        cy.contains('button', /confirm|yes|delete/i).click();

        cy.wait('@deleteEngagementError');

        // Should show error message
        cy.contains(/error/i).should('be.visible');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should display engagement list on mobile', () => {
      cy.viewport(375, 667);

      cy.fixture('engagements').then((engagements) => {
        cy.visit('/dashboard/engagements');
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagements');

        // Should show card layout on mobile
        engagements.results.forEach((engagement) => {
          cy.contains(engagement.film.title).should('be.visible');
        });
      });
    });

    it('should display engagement list on desktop', () => {
      cy.viewport(1280, 720);

      cy.fixture('engagements').then((engagements) => {
        cy.visit('/dashboard/engagements');
        cy.wait('@getCurrentUser');
        cy.wait('@getEngagements');

        // Should show table layout on desktop
        engagements.results.forEach((engagement) => {
          cy.contains(engagement.film.title).should('be.visible');
        });
      });
    });
  });
});
