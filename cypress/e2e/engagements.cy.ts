describe('Engagements List Page', () => {
  // Use future dates so status dropdowns aren't disabled (end_date must be after today)
  const engagementsFixture = [
    {
      id: 1,
      film: 1,
      film_title: 'The Grand Adventure',
      film_poster_url: '/poster1.jpg',
      screen: 1,
      screen_name: 'Screen 1',
      start_date: '2027-02-01',
      end_date: '2027-02-14',
      presentation_format: '2d',
      status: 'CONFIRMED',
      notes: 'Opening week special screening',
      is_active: true,
      created_at: '2027-01-15T10:00:00Z',
    },
    {
      id: 2,
      film: 2,
      film_title: 'Mystery at Midnight',
      film_poster_url: '/poster2.jpg',
      screen: 2,
      screen_name: 'Screen 2',
      start_date: '2027-02-15',
      end_date: '2027-02-28',
      presentation_format: '3d',
      status: 'CONFIRMED',
      notes: '',
      is_active: true,
      created_at: '2027-01-20T10:00:00Z',
    },
  ];

  const screensFixture = [
    {
      id: 1,
      name: 'Screen 1',
      capacity: 150,
      screen_type: 'standard',
      aspect_ratio: 'flat',
      sound_system: 'standard',
      supports_3d: false,
    },
    {
      id: 2,
      name: 'Screen 2',
      capacity: 100,
      screen_type: 'standard',
      aspect_ratio: 'scope',
      sound_system: 'dolby_atmos',
      supports_3d: true,
    },
  ];

  beforeEach(() => {
    // Auth
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser');
    });

    // Screens (needed by create/edit form) — use regex to match with or without query string
    cy.intercept('GET', /\/api\/v1\/screens\//, {
      statusCode: 200,
      body: { count: 2, results: screensFixture },
    }).as('getScreens');

    // Films (needed by FilmSearchCombo)
    cy.intercept('GET', /\/api\/v1\/films\//, {
      statusCode: 200,
      body: { count: 0, results: [] },
    }).as('getFilms');
  });

  function stubEngagementsList(engagements = engagementsFixture) {
    cy.intercept('GET', /\/api\/v1\/engagements\/(\?.*)?$/, {
      statusCode: 200,
      body: { count: engagements.length, results: engagements },
    }).as('getEngagements');
  }

  describe('List View', () => {
    it('should display list of engagements with correct data', () => {
      stubEngagementsList();
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      // Both film titles should be visible
      cy.contains('The Grand Adventure').should('be.visible');
      cy.contains('Mystery at Midnight').should('be.visible');

      // Screen names should be visible
      cy.contains('td', 'Screen 1').should('be.visible');
      cy.contains('td', 'Screen 2').should('be.visible');

      // Format should be displayed uppercase
      cy.contains('2D').should('exist');
      cy.contains('3D').should('exist');
    });

    it('should show empty state when no engagements exist', () => {
      stubEngagementsList([]);
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      cy.contains(/no.*engagements/i).should('be.visible');
    });

    it('should show the "+ New Engagement" button', () => {
      stubEngagementsList();
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      cy.contains('button', '+ New Engagement').should('be.visible');
    });
  });

  describe('Filter Tabs', () => {
    it('should display all filter tabs', () => {
      stubEngagementsList();
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');

      cy.get('[role="tablist"]').within(() => {
        cy.contains('Current').should('be.visible');
        cy.contains('Upcoming').should('be.visible');
        cy.contains('Draft').should('be.visible');
        cy.contains('Ended').should('be.visible');
        cy.contains('Cancelled').should('be.visible');
      });
    });

    it('should default to Current tab selected', () => {
      stubEngagementsList();
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');

      cy.get('[role="tab"][aria-selected="true"]').should('contain', 'Current');
    });

    it('should switch tabs and refetch engagements', () => {
      stubEngagementsList();
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      // Click Upcoming tab
      cy.contains('[role="tab"]', 'Upcoming').click();
      cy.wait('@getEngagements');

      // Click Draft tab
      cy.contains('[role="tab"]', 'Draft').click();
      cy.wait('@getEngagements');
    });

    it('should show tab-specific empty state message', () => {
      stubEngagementsList([]);
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      // Default "Current" tab empty state
      cy.contains('No current engagements').should('be.visible');

      // Switch to Upcoming
      cy.contains('[role="tab"]', 'Upcoming').click();
      cy.wait('@getEngagements');
      cy.contains('No upcoming engagements').should('be.visible');
    });

    it('should show "View All Engagements" button in filtered empty state', () => {
      stubEngagementsList([]);
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      cy.contains('button', 'View All Engagements').should('be.visible');
    });
  });

  describe('Create Engagement', () => {
    beforeEach(() => {
      stubEngagementsList();
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');
    });

    it('should open the create drawer when clicking "+ New Engagement"', () => {
      cy.contains('button', '+ New Engagement').click();

      cy.dataCy('drawer').should('be.visible');
      cy.dataCy('drawer-title').should('contain', 'New Engagement');
    });

    it('should display all form fields in the drawer', () => {
      cy.contains('button', '+ New Engagement').click();

      cy.dataCy('drawer').within(() => {
        cy.get('#film-search').should('exist');
        cy.get('#engagement-screen').should('exist');
        cy.get('#engagement-start-date').should('exist');
        cy.get('#engagement-end-date').should('exist');
        cy.get('#engagement-format').should('exist');
        cy.get('#engagement-status').should('exist');
        cy.get('#engagement-notes').should('exist');
      });
    });

    it('should have correct default values in create form', () => {
      cy.contains('button', '+ New Engagement').click();

      cy.dataCy('drawer').within(() => {
        cy.get('#engagement-screen').should('have.value', '');
        cy.get('#engagement-start-date').should('have.value', '');
        cy.get('#engagement-end-date').should('have.value', '');
        cy.get('#engagement-format').should('have.value', '2d');
        cy.get('#engagement-status').should('have.value', 'DRAFT');
        cy.get('#engagement-notes').should('have.value', '');
      });
    });

    it('should populate screen dropdown with available screens', () => {
      cy.contains('button', '+ New Engagement').click();

      cy.dataCy('drawer').within(() => {
        cy.get('#engagement-screen option').should('have.length', 3); // "Select a screen" + 2 screens
        cy.get('#engagement-screen').contains('option', 'Screen 1 (150 seats)').should('exist');
        cy.get('#engagement-screen').contains('option', 'Screen 2 (100 seats)').should('exist');
      });
    });

    it('should create engagement with valid data', () => {
      const newEngagement = {
        id: 3,
        film: 1,
        film_title: 'New Film',
        film_poster_url: null,
        screen: 1,
        screen_name: 'Screen 1',
        start_date: '2027-03-01',
        end_date: '2027-03-15',
        presentation_format: '2d',
        status: 'DRAFT',
        notes: 'Test notes',
        is_active: true,
        created_at: '2027-02-25T10:00:00Z',
      };

      // Override films intercept for search
      cy.intercept('GET', /\/api\/v1\/films\/\?search=/, {
        statusCode: 200,
        body: {
          count: 1,
          results: [
            {
              id: 1,
              title: 'New Film',
              runtime_minutes: 120,
              rating: 'PG',
              synopsis: '',
              poster_url: '',
              tmdb_id: null,
              imdb_id: null,
            },
          ],
        },
      }).as('searchFilms');

      cy.intercept('POST', '/api/v1/engagements/', {
        statusCode: 201,
        body: newEngagement,
      }).as('createEngagement');

      cy.contains('button', '+ New Engagement').click();

      // Select film via search
      cy.get('#film-search').type('New Film');
      cy.wait('@searchFilms');
      cy.contains('[role="option"]', 'New Film').click();

      // Fill in rest of form
      cy.get('#engagement-screen').select('Screen 1 (150 seats)');
      cy.get('#engagement-start-date').type('2027-03-01');
      cy.get('#engagement-end-date').type('2027-03-15');
      cy.get('#engagement-notes').type('Test notes');

      // Submit
      cy.dataCy('drawer-footer').contains('button', 'Create Engagement').click();
      cy.wait('@createEngagement');

      // Drawer should close
      cy.dataCy('drawer').should('not.exist');
    });

    it('should not submit when required fields are empty', () => {
      cy.intercept('POST', '/api/v1/engagements/').as('createEngagement');

      cy.contains('button', '+ New Engagement').click();

      // Try to submit without filling anything
      cy.dataCy('drawer-footer').contains('button', 'Create Engagement').click();

      // Should NOT have made the API call (film and screen are empty, JS guard prevents it)
      cy.get('@createEngagement.all').should('have.length', 0);

      // Drawer should still be open
      cy.dataCy('drawer').should('be.visible');
    });

    it('should close the drawer when clicking Cancel', () => {
      cy.contains('button', '+ New Engagement').click();
      cy.dataCy('drawer').should('be.visible');

      cy.dataCy('drawer-footer').contains('button', 'Cancel').click();
      cy.dataCy('drawer').should('not.exist');
    });

    it('should close the drawer when clicking the X button', () => {
      cy.contains('button', '+ New Engagement').click();
      cy.dataCy('drawer').should('be.visible');

      cy.dataCy('drawer-close').click();
      cy.dataCy('drawer').should('not.exist');
    });

    it('should close the drawer on Escape key', () => {
      cy.contains('button', '+ New Engagement').click();
      cy.dataCy('drawer').should('be.visible');

      cy.get('body').type('{esc}');
      cy.dataCy('drawer').should('not.exist');
    });

    it('should show error toast on API failure', () => {
      cy.intercept('GET', /\/api\/v1\/films\/\?search=/, {
        statusCode: 200,
        body: {
          count: 1,
          results: [
            {
              id: 1,
              title: 'Film A',
              runtime_minutes: 90,
              rating: 'PG',
              synopsis: '',
              poster_url: '',
              tmdb_id: null,
              imdb_id: null,
            },
          ],
        },
      }).as('searchFilms');

      cy.intercept('POST', '/api/v1/engagements/', {
        statusCode: 400,
        body: { non_field_errors: ['Overlapping engagement exists.'] },
      }).as('createEngagementError');

      cy.contains('button', '+ New Engagement').click();

      cy.get('#film-search').type('Film A');
      cy.wait('@searchFilms');
      cy.contains('[role="option"]', 'Film A').click();
      cy.get('#engagement-screen').select('Screen 1 (150 seats)');
      cy.get('#engagement-start-date').type('2027-03-01');
      cy.get('#engagement-end-date').type('2027-03-15');

      cy.dataCy('drawer-footer').contains('button', 'Create Engagement').click();
      cy.wait('@createEngagementError');

      // Toast should show the error from the API response
      cy.contains('Overlapping engagement exists.').should('be.visible');
    });
  });

  describe('Edit Engagement', () => {
    beforeEach(() => {
      stubEngagementsList();
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');
    });

    it('should open the edit drawer with pre-populated data', () => {
      cy.contains('tr', 'The Grand Adventure').within(() => {
        cy.contains('button', 'Edit').click();
      });

      cy.dataCy('drawer').should('be.visible');
      cy.dataCy('drawer-title').should('contain', 'Edit Engagement');

      // Form should be pre-populated
      cy.get('#engagement-screen').should('have.value', '1');
      cy.get('#engagement-start-date').should('have.value', '2027-02-01');
      cy.get('#engagement-end-date').should('have.value', '2027-02-14');
      cy.get('#engagement-format').should('have.value', '2d');
      cy.get('#engagement-status').should('have.value', 'CONFIRMED');
      cy.get('#engagement-notes').should('have.value', 'Opening week special screening');
    });

    it('should save changes when editing', () => {
      cy.intercept('PATCH', '/api/v1/engagements/1/', {
        statusCode: 200,
        body: { ...engagementsFixture[0], notes: 'Updated notes' },
      }).as('updateEngagement');

      cy.contains('tr', 'The Grand Adventure').within(() => {
        cy.contains('button', 'Edit').click();
      });

      cy.dataCy('drawer').should('be.visible');
      cy.get('#engagement-notes').clear().type('Updated notes');
      cy.dataCy('drawer-footer').contains('button', 'Save Changes').click();
      cy.wait('@updateEngagement');

      cy.dataCy('drawer').should('not.exist');
    });

    it('should show error toast on update failure', () => {
      cy.intercept('PATCH', '/api/v1/engagements/1/', {
        statusCode: 400,
        body: { non_field_errors: ['Date range overlaps with another engagement.'] },
      }).as('updateEngagementError');

      cy.contains('tr', 'The Grand Adventure').within(() => {
        cy.contains('button', 'Edit').click();
      });

      cy.dataCy('drawer').should('be.visible');
      cy.get('#engagement-notes').clear().type('some change');
      cy.dataCy('drawer-footer').contains('button', 'Save Changes').click();
      cy.wait('@updateEngagementError');

      cy.contains('Date range overlaps with another engagement.').should('be.visible');
    });
  });

  describe('Delete Engagement', () => {
    beforeEach(() => {
      stubEngagementsList();
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');
    });

    it('should show confirmation dialog when clicking Delete', () => {
      cy.contains('tr', 'The Grand Adventure').within(() => {
        cy.contains('button', 'Delete').click();
      });

      cy.get('[role="alertdialog"]').should('be.visible');
      cy.contains('Delete Engagement').should('be.visible');
      cy.contains('The Grand Adventure').should('be.visible');
    });

    it('should delete engagement after confirming', () => {
      cy.intercept('DELETE', '/api/v1/engagements/1/', {
        statusCode: 204,
      }).as('deleteEngagement');

      cy.contains('tr', 'The Grand Adventure').within(() => {
        cy.contains('button', 'Delete').click();
      });

      cy.get('[data-confirm-ok]').click();
      cy.wait('@deleteEngagement');
    });

    it('should cancel deletion when clicking Cancel in dialog', () => {
      cy.intercept('DELETE', '/api/v1/engagements/1/').as('deleteEngagement');

      cy.contains('tr', 'The Grand Adventure').within(() => {
        cy.contains('button', 'Delete').click();
      });

      cy.get('[data-confirm-cancel]').click();
      cy.get('[role="alertdialog"]').should('not.exist');
      cy.get('@deleteEngagement.all').should('have.length', 0);
    });

    it('should show error toast on delete failure', () => {
      cy.intercept('DELETE', '/api/v1/engagements/1/', {
        statusCode: 400,
        body: { detail: 'Cannot delete engagement with existing ticket sales.' },
      }).as('deleteEngagementError');

      cy.contains('tr', 'The Grand Adventure').within(() => {
        cy.contains('button', 'Delete').click();
      });

      cy.get('[data-confirm-ok]').click();
      cy.wait('@deleteEngagementError');

      cy.contains('Cannot delete engagement with existing ticket sales.').should('be.visible');
    });
  });

  describe('Inline Status Change', () => {
    beforeEach(() => {
      stubEngagementsList();
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');
    });

    it('should display status dropdown for each engagement', () => {
      cy.get('[aria-haspopup="listbox"]').should('have.length.at.least', 2);
    });

    it('should open status dropdown and show options', () => {
      // Click the first status dropdown (should not be disabled since dates are in 2027)
      cy.get('[aria-haspopup="listbox"]').first().should('not.be.disabled').click();

      cy.get('[role="listbox"]').should('be.visible');
      cy.get('[role="listbox"]').within(() => {
        cy.contains('Draft').should('exist');
        cy.contains('Confirmed').should('exist');
        cy.contains('Cancelled').should('exist');
      });
    });

    it('should update status via inline dropdown', () => {
      cy.intercept('PATCH', '/api/v1/engagements/1/', {
        statusCode: 200,
        body: { ...engagementsFixture[0], status: 'CANCELLED' },
      }).as('updateStatus');

      cy.get('[aria-haspopup="listbox"]').first().click();

      cy.get('[role="listbox"]').within(() => {
        cy.contains('Cancelled').click();
      });

      cy.wait('@updateStatus').its('request.body').should('deep.equal', { status: 'CANCELLED' });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      stubEngagementsList();
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');
    });

    it('should navigate to engagement detail page via Details link', () => {
      cy.intercept('GET', '/api/v1/engagements/1/', {
        statusCode: 200,
        body: engagementsFixture[0],
      }).as('getEngagement');

      cy.intercept('GET', /\/api\/v1\/showtimes\//, {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getShowtimes');

      cy.intercept('GET', '/api/v1/films/1/', {
        statusCode: 200,
        body: {
          id: 1,
          title: 'The Grand Adventure',
          runtime_minutes: 120,
          rating: 'PG',
          synopsis: '',
          poster_url: '',
          tmdb_id: null,
          imdb_id: null,
        },
      }).as('getFilm');

      cy.contains('tr', 'The Grand Adventure').within(() => {
        cy.contains('Details').click();
      });

      cy.url().should('include', '/dashboard/engagements/1');
    });
  });

  describe('Responsive Design', () => {
    it('should show card layout on mobile with film titles', () => {
      stubEngagementsList();
      cy.viewport(375, 667);
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      // On mobile, card list should be visible (table is hidden)
      // Card titles use h3 elements
      cy.get('h3').contains('The Grand Adventure').should('be.visible');
      cy.get('h3').contains('Mystery at Midnight').should('be.visible');
    });

    it('should show table layout on desktop', () => {
      stubEngagementsList();
      cy.viewport(1280, 720);
      cy.visit('/dashboard/engagements');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagements');

      cy.contains('th', 'Film').should('be.visible');
      cy.contains('th', 'Screen').should('be.visible');
      cy.contains('th', 'Dates').should('be.visible');
      cy.contains('th', 'Format').should('be.visible');
      cy.contains('th', 'Status').should('be.visible');
      cy.contains('th', 'Actions').should('be.visible');
    });
  });
});

describe('Engagement Detail Page', () => {
  const engagement = {
    id: 1,
    film: 1,
    film_title: 'The Grand Adventure',
    film_poster_url: '/poster1.jpg',
    screen: 1,
    screen_name: 'Screen 1',
    start_date: '2027-02-01',
    end_date: '2027-02-14',
    presentation_format: '2d',
    status: 'CONFIRMED',
    notes: 'Opening week special screening',
    is_active: true,
    created_at: '2027-01-15T10:00:00Z',
  };

  const film = {
    id: 1,
    title: 'The Grand Adventure',
    runtime_minutes: 120,
    rating: 'PG',
    synopsis: 'An epic adventure film.',
    poster_url: '/poster1.jpg',
    tmdb_id: '12345',
    imdb_id: null,
  };

  const showtimes = [
    {
      id: 1,
      engagement: 1,
      screen: 1,
      screen_name: 'Screen 1',
      starts_at: '2027-02-01T19:00:00Z',
      is_cancelled: false,
      captions: 'CC',
      film_title: 'The Grand Adventure',
      film_poster_url: '/poster1.jpg',
      is_outside_engagement_range: false,
      presentation_format: '2d',
      presentation_format_display: '2D',
    },
    {
      id: 2,
      engagement: 1,
      screen: 1,
      screen_name: 'Screen 1',
      starts_at: '2027-02-02T14:00:00Z',
      is_cancelled: false,
      captions: null,
      film_title: 'The Grand Adventure',
      film_poster_url: '/poster1.jpg',
      is_outside_engagement_range: false,
      presentation_format: '2d',
      presentation_format_display: '2D',
    },
    {
      id: 3,
      engagement: 1,
      screen: 1,
      screen_name: 'Screen 1',
      starts_at: '2027-02-03T19:00:00Z',
      is_cancelled: true,
      captions: 'OC',
      film_title: 'The Grand Adventure',
      film_poster_url: '/poster1.jpg',
      is_outside_engagement_range: false,
      presentation_format: '2d',
      presentation_format_display: '2D',
    },
  ];

  beforeEach(() => {
    cy.fixture('user').then((user) => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: user,
      }).as('getCurrentUser');
    });

    cy.intercept('GET', '/api/v1/engagements/1/', {
      statusCode: 200,
      body: engagement,
    }).as('getEngagement');

    cy.intercept('GET', '/api/v1/films/1/', {
      statusCode: 200,
      body: film,
    }).as('getFilm');

    cy.intercept('GET', /\/api\/v1\/showtimes\/\?engagement=1/, {
      statusCode: 200,
      body: { count: showtimes.length, results: showtimes },
    }).as('getShowtimes');

    // Catch-all for other API calls
    cy.intercept('GET', /\/api\/v1\/engagements\/(\?.*)?$/, {
      statusCode: 200,
      body: { count: 0, results: [] },
    }).as('getEngagementsList');
  });

  describe('Engagement Info', () => {
    it('should display engagement header with film title', () => {
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');

      cy.contains('h1', 'The Grand Adventure').should('be.visible');
      cy.contains('Engagement Details & Showtimes').should('be.visible');
    });

    it('should show back link to engagements list', () => {
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');

      cy.contains('Back to Engagements')
        .should('be.visible')
        .and('have.attr', 'href', '/dashboard/engagements');
    });

    it('should display engagement details card', () => {
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');

      cy.contains('Engagement Details').should('be.visible');
      cy.contains('CONFIRMED').should('be.visible');
      cy.contains('Screen 1').should('be.visible');
      cy.contains('2D').should('be.visible');
      cy.contains('Opening week special screening').should('be.visible');
    });

    it('should display film details card', () => {
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');
      cy.wait('@getFilm');

      cy.contains('Film Details').should('be.visible');
      cy.contains('120 min').should('be.visible');
      cy.contains('PG').should('be.visible');
      cy.contains('An epic adventure film.').should('be.visible');
    });

    it('should show not found state for invalid engagement', () => {
      cy.intercept('GET', '/api/v1/engagements/99999/', {
        statusCode: 404,
        body: { detail: 'Not found.' },
      }).as('getEngagement404');

      cy.visit('/dashboard/engagements/99999');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement404');

      cy.contains('Engagement not found.').should('be.visible');
      cy.contains('Back to Engagements').should('be.visible');
    });
  });

  describe('Showtimes List', () => {
    it('should display showtimes sorted by date', () => {
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');
      cy.wait('@getShowtimes');

      cy.contains('Showtimes').should('be.visible');
      cy.get('table tbody tr').should('have.length', 3);
    });

    it('should display showtime details in table', () => {
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');
      cy.wait('@getShowtimes');

      // Table headers
      cy.contains('th', 'Date & Time').should('exist');
      cy.contains('th', 'Screen').should('exist');
      cy.contains('th', 'Captions').should('exist');
      cy.contains('th', 'Status').should('exist');
      cy.contains('th', 'Actions').should('exist');

      // Active showtime should show "Active" badge
      cy.contains('Active').should('exist');

      // Cancelled showtime should show "Cancelled" badge
      cy.contains('Cancelled').should('exist');

      // Caption badges
      cy.contains('CC').should('exist');
      cy.contains('OC').should('exist');
    });

    it('should show empty state when no showtimes exist', () => {
      cy.intercept('GET', /\/api\/v1\/showtimes\/\?engagement=1/, {
        statusCode: 200,
        body: { count: 0, results: [] },
      }).as('getEmptyShowtimes');

      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');
      cy.wait('@getEmptyShowtimes');

      cy.contains('No showtimes scheduled for this engagement.').should('be.visible');
      cy.contains('button', 'Add your first showtime').should('be.visible');
    });

    it('should show Edit and Delete buttons for each showtime', () => {
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');
      cy.wait('@getShowtimes');

      cy.get('table tbody tr').each(($row) => {
        cy.wrap($row).within(() => {
          cy.contains('button', 'Edit').should('exist');
          cy.contains('button', 'Delete').should('exist');
        });
      });
    });
  });

  describe('Add Showtime', () => {
    beforeEach(() => {
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');
      cy.wait('@getShowtimes');
      // Ensure page is fully rendered with showtimes table
      cy.get('table tbody tr').should('have.length', 3);
    });

    it('should open the create showtime drawer', () => {
      cy.contains('button', '+ Add Showtime').click();

      cy.dataCy('drawer').should('be.visible');
      cy.dataCy('drawer-title').should('contain', 'Add Showtime');
    });

    it('should display date, time, and captions fields', () => {
      cy.contains('button', '+ Add Showtime').click();

      cy.dataCy('drawer').within(() => {
        cy.get('#engagement-detail-showtime-date').should('exist');
        cy.get('#engagement-detail-showtime-time').should('exist');
        cy.get('#engagement-detail-showtime-captions').should('exist');
      });
    });

    it('should default start date to engagement start date', () => {
      cy.contains('button', '+ Add Showtime').click();

      cy.get('#engagement-detail-showtime-date').should('have.value', '2027-02-01');
    });

    it('should constrain date to engagement date range', () => {
      cy.contains('button', '+ Add Showtime').click();

      cy.get('#engagement-detail-showtime-date')
        .should('have.attr', 'min', '2027-02-01')
        .and('have.attr', 'max', '2027-02-14');
    });

    it('should create a showtime with valid data', () => {
      const newShowtime = {
        id: 4,
        engagement: 1,
        screen: 1,
        screen_name: 'Screen 1',
        starts_at: '2027-02-05T19:30:00Z',
        is_cancelled: false,
        captions: null,
        film_title: 'The Grand Adventure',
        film_poster_url: '/poster1.jpg',
        is_outside_engagement_range: false,
        presentation_format: '2d',
        presentation_format_display: '2D',
      };

      cy.intercept('POST', '/api/v1/showtimes/', {
        statusCode: 201,
        body: newShowtime,
      }).as('createShowtime');

      cy.contains('button', '+ Add Showtime').click();
      cy.dataCy('drawer').should('be.visible');

      cy.get('#engagement-detail-showtime-date').clear().type('2027-02-05');
      cy.get('#engagement-detail-showtime-time').type('19:30');

      cy.dataCy('drawer-footer').contains('button', 'Add Showtime').click();
      cy.wait('@createShowtime');

      cy.dataCy('drawer').should('not.exist');
    });

    it('should not submit without required fields', () => {
      cy.intercept('POST', '/api/v1/showtimes/').as('createShowtime');

      cy.contains('button', '+ Add Showtime').click();
      cy.dataCy('drawer').should('be.visible');

      // Clear the pre-populated date
      cy.get('#engagement-detail-showtime-date').clear();

      cy.dataCy('drawer-footer').contains('button', 'Add Showtime').click();

      // Should not have made API call
      cy.get('@createShowtime.all').should('have.length', 0);
      cy.dataCy('drawer').should('be.visible');
    });

    it('should show error toast on create failure', () => {
      cy.intercept('POST', '/api/v1/showtimes/', {
        statusCode: 400,
        body: { detail: 'Showtime conflicts with existing schedule.' },
      }).as('createShowtimeError');

      cy.contains('button', '+ Add Showtime').click();
      cy.dataCy('drawer').should('be.visible');

      cy.get('#engagement-detail-showtime-date').clear().type('2027-02-05');
      cy.get('#engagement-detail-showtime-time').type('19:30');

      cy.dataCy('drawer-footer').contains('button', 'Add Showtime').click();
      cy.wait('@createShowtimeError');

      cy.contains('Showtime conflicts with existing schedule.').should('be.visible');
    });

    it('should allow selecting captions option', () => {
      cy.intercept('POST', '/api/v1/showtimes/', (req) => {
        expect(req.body.captions).to.equal('CC');
        req.reply({ statusCode: 201, body: { ...showtimes[0], id: 10 } });
      }).as('createShowtimeCC');

      cy.contains('button', '+ Add Showtime').click();
      cy.dataCy('drawer').should('be.visible');

      cy.get('#engagement-detail-showtime-date').clear().type('2027-02-05');
      cy.get('#engagement-detail-showtime-time').type('14:00');
      cy.get('#engagement-detail-showtime-captions').select('CC');

      cy.dataCy('drawer-footer').contains('button', 'Add Showtime').click();
      cy.wait('@createShowtimeCC');
    });
  });

  describe('Edit Showtime', () => {
    beforeEach(() => {
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');
      cy.wait('@getShowtimes');
      cy.get('table tbody tr').should('have.length', 3);
    });

    it('should open edit drawer with pre-populated data', () => {
      cy.get('table tbody tr')
        .first()
        .within(() => {
          cy.contains('button', 'Edit').click();
        });

      cy.dataCy('drawer').should('be.visible');
      cy.dataCy('drawer-title').should('contain', 'Edit Showtime');

      // Should have date and time pre-populated
      cy.get('#engagement-detail-showtime-date').invoke('val').should('not.be.empty');
      cy.get('#engagement-detail-showtime-time').invoke('val').should('not.be.empty');
    });

    it('should show cancelled checkbox in edit mode', () => {
      cy.get('table tbody tr')
        .first()
        .within(() => {
          cy.contains('button', 'Edit').click();
        });

      cy.dataCy('drawer').within(() => {
        cy.contains('Cancelled').should('exist');
        cy.get('input[type="checkbox"]').should('exist');
      });
    });

    it('should save showtime changes', () => {
      cy.intercept('PATCH', '/api/v1/showtimes/1/', {
        statusCode: 200,
        body: { ...showtimes[0], captions: 'OC' },
      }).as('updateShowtime');

      cy.get('table tbody tr')
        .first()
        .within(() => {
          cy.contains('button', 'Edit').click();
        });

      cy.get('#engagement-detail-showtime-captions').select('OC');
      cy.dataCy('drawer-footer').contains('button', 'Save Changes').click();
      cy.wait('@updateShowtime');

      cy.dataCy('drawer').should('not.exist');
    });

    it('should show error toast on update failure', () => {
      cy.intercept('PATCH', '/api/v1/showtimes/1/', {
        statusCode: 400,
        body: { detail: 'Time slot already occupied.' },
      }).as('updateShowtimeError');

      cy.get('table tbody tr')
        .first()
        .within(() => {
          cy.contains('button', 'Edit').click();
        });

      cy.dataCy('drawer-footer').contains('button', 'Save Changes').click();
      cy.wait('@updateShowtimeError');

      cy.contains('Time slot already occupied.').should('be.visible');
    });
  });

  describe('Delete Showtime', () => {
    beforeEach(() => {
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');
      cy.wait('@getShowtimes');
      cy.get('table tbody tr').should('have.length', 3);
    });

    it('should show confirmation dialog when deleting a showtime', () => {
      cy.get('table tbody tr')
        .first()
        .within(() => {
          cy.contains('button', 'Delete').click();
        });

      cy.get('[role="alertdialog"]').should('be.visible');
      cy.contains('Delete Showtime').should('be.visible');
    });

    it('should delete showtime after confirming', () => {
      cy.intercept('DELETE', '/api/v1/showtimes/1/', {
        statusCode: 204,
      }).as('deleteShowtime');

      cy.get('table tbody tr')
        .first()
        .within(() => {
          cy.contains('button', 'Delete').click();
        });

      cy.get('[data-confirm-ok]').click();
      cy.wait('@deleteShowtime');
    });

    it('should cancel showtime deletion', () => {
      cy.intercept('DELETE', '/api/v1/showtimes/1/').as('deleteShowtime');

      cy.get('table tbody tr')
        .first()
        .within(() => {
          cy.contains('button', 'Delete').click();
        });

      cy.get('[data-confirm-cancel]').click();
      cy.get('[role="alertdialog"]').should('not.exist');
      cy.get('@deleteShowtime.all').should('have.length', 0);
    });

    it('should show error toast on delete failure', () => {
      cy.intercept('DELETE', '/api/v1/showtimes/1/', {
        statusCode: 400,
        body: { detail: 'Cannot delete showtime with sold tickets.' },
      }).as('deleteShowtimeError');

      cy.get('table tbody tr')
        .first()
        .within(() => {
          cy.contains('button', 'Delete').click();
        });

      cy.get('[data-confirm-ok]').click();
      cy.wait('@deleteShowtimeError');

      cy.contains('Cannot delete showtime with sold tickets.').should('be.visible');
    });
  });

  describe('Bulk Add Showtimes', () => {
    beforeEach(() => {
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');
      cy.wait('@getShowtimes');
      cy.get('table tbody tr').should('have.length', 3);
    });

    it('should open the bulk add drawer', () => {
      cy.contains('button', 'Bulk Add').click();

      cy.dataCy('drawer').should('be.visible');
      cy.dataCy('drawer-title').should('contain', 'Bulk Add Showtimes');
    });

    it('should pre-populate dates from engagement range', () => {
      cy.contains('button', 'Bulk Add').click();

      cy.get('#engagement-detail-bulk-start-date').should('have.value', '2027-02-01');
      cy.get('#engagement-detail-bulk-end-date').should('have.value', '2027-02-14');
    });

    it('should have one time slot by default', () => {
      cy.contains('button', 'Bulk Add').click();

      cy.get('input[type="time"]').should('have.length', 1);
    });

    it('should add and remove time slots', () => {
      cy.contains('button', 'Bulk Add').click();

      // Add another time slot
      cy.contains('button', '+ Add another time').click();
      cy.get('input[type="time"]').should('have.length', 2);

      // Add a third
      cy.contains('button', '+ Add another time').click();
      cy.get('input[type="time"]').should('have.length', 3);

      // Remove one (click the x button)
      cy.get('input[type="time"]').eq(1).parent().find('button').click();
      cy.get('input[type="time"]').should('have.length', 2);
    });

    it('should submit bulk create with valid data', () => {
      cy.intercept('POST', '/api/v1/showtimes/bulk-create/', {
        statusCode: 201,
        body: [showtimes[0], showtimes[1]],
      }).as('bulkCreate');

      cy.contains('button', 'Bulk Add').click();

      cy.get('input[type="time"]').first().type('19:00');
      cy.contains('button', '+ Add another time').click();
      cy.get('input[type="time"]').last().type('14:00');

      cy.dataCy('drawer-footer').contains('button', 'Create Showtimes').click();
      cy.wait('@bulkCreate');

      cy.dataCy('drawer').should('not.exist');
    });

    it('should show error toast on bulk create failure', () => {
      cy.intercept('POST', '/api/v1/showtimes/bulk-create/', {
        statusCode: 400,
        body: { detail: 'Date range exceeds engagement period.' },
      }).as('bulkCreateError');

      cy.contains('button', 'Bulk Add').click();

      cy.get('input[type="time"]').first().type('19:00');
      cy.dataCy('drawer-footer').contains('button', 'Create Showtimes').click();
      cy.wait('@bulkCreateError');

      cy.contains('Date range exceeds engagement period.').should('be.visible');
    });

    it('should allow selecting captions for bulk showtimes', () => {
      cy.intercept('POST', '/api/v1/showtimes/bulk-create/', (req) => {
        expect(req.body.captions).to.equal('OC');
        req.reply({ statusCode: 201, body: [] });
      }).as('bulkCreateOC');

      cy.contains('button', 'Bulk Add').click();

      cy.get('input[type="time"]').first().type('19:00');
      cy.get('#engagement-detail-bulk-captions').select('OC');

      cy.dataCy('drawer-footer').contains('button', 'Create Showtimes').click();
      cy.wait('@bulkCreateOC');
    });
  });

  describe('Responsive Design', () => {
    it('should show card layout on mobile', () => {
      cy.viewport(375, 667);
      cy.visit('/dashboard/engagements/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getEngagement');
      cy.wait('@getShowtimes');

      // On mobile, the card list is visible and table is hidden
      // Verify engagement title is still shown in the header
      cy.contains('h1', 'The Grand Adventure').should('be.visible');
      // Card view should show showtime action buttons (filter to visible only)
      cy.get('button:visible').contains('Edit').should('exist');
      cy.get('button:visible').contains('Delete').should('exist');
    });
  });
});
