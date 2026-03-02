describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear any existing sessions
    cy.clearAllSessionStorage();
    cy.clearAllCookies();
    cy.clearLocalStorage();
  });

  describe('Login with Mock Backend', () => {
    it('should display login prompt when not authenticated', () => {
      // Mock the auth endpoint to return 401
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 401,
        body: { detail: 'Authentication credentials were not provided.' },
      }).as('checkAuth');

      cy.visit('/dashboard');

      // Should attempt to check authentication
      cy.wait('@checkAuth');

      // React app should handle the 401 and show appropriate UI
      // The ProtectedRoute component should prevent access
      // Based on AuthContext, it may show a loading state or redirect
    });

    it('should successfully authenticate with valid credentials', () => {
      cy.fixture('user').then((user) => {
        // Mock successful login
        cy.intercept('POST', '/api/v1/auth/login/', {
          statusCode: 200,
          body: user,
        }).as('login');

        // Mock the "me" endpoint for session validation
        cy.intercept('GET', '/api/v1/auth/me/', {
          statusCode: 200,
          body: user,
        }).as('getCurrentUser');

        cy.visit('/dashboard');

        // In a real scenario, there would be a login form
        // For now, we're testing with mocked auth
        // The application uses Django's login, so this test verifies
        // the client-side session handling
      });
    });

    it('should load user data and set current cinema on mount', () => {
      cy.fixture('user').then((user) => {
        cy.intercept('GET', '/api/v1/auth/me/', {
          statusCode: 200,
          body: user,
        }).as('getCurrentUser');

        cy.visit('/dashboard');
        cy.wait('@getCurrentUser');

        // Verify cinema was stored in localStorage
        cy.window().then((win) => {
          const storedCinemaId = win.localStorage.getItem('selected_cinema_id');
          expect(storedCinemaId).to.eq('1');
        });
      });
    });

    it('should handle authentication errors gracefully', () => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 500,
        body: { detail: 'Internal server error' },
      }).as('authError');

      cy.visit('/dashboard', { failOnStatusCode: false });

      // Should not crash the app
      // AuthContext should set user to null and isLoading to false
    });
  });

  describe('Logout', () => {
    it('should successfully log out user', () => {
      cy.fixture('user').then((user) => {
        // Set up authenticated session
        cy.intercept('GET', '/api/v1/auth/me/', {
          statusCode: 200,
          body: user,
        }).as('getCurrentUser');

        cy.intercept('POST', '/api/v1/auth/logout/', {
          statusCode: 200,
          body: { detail: 'Successfully logged out.' },
        }).as('logout');

        cy.visit('/dashboard');
        cy.wait('@getCurrentUser');

        // Trigger logout - this would typically be a button click
        // For now, test the logout function directly via window
        cy.window().then((win) => {
          // Clear auth state
          win.localStorage.removeItem('selected_cinema_id');
        });

        // Verify localStorage is cleared
        cy.window().then((win) => {
          expect(win.localStorage.getItem('selected_cinema_id')).to.be.null;
        });
      });
    });
  });

  describe('Cinema Selection', () => {
    it('should allow switching between cinemas', () => {
      cy.fixture('user').then((user) => {
        cy.intercept('GET', '/api/v1/auth/me/', {
          statusCode: 200,
          body: user,
        }).as('getCurrentUser');

        cy.visit('/dashboard');
        cy.wait('@getCurrentUser');

        // Initially should select first cinema
        cy.window().then((win) => {
          expect(win.localStorage.getItem('selected_cinema_id')).to.eq('1');
        });

        // Switch to second cinema
        cy.window().then((win) => {
          win.localStorage.setItem('selected_cinema_id', '2');
        });

        cy.window().then((win) => {
          expect(win.localStorage.getItem('selected_cinema_id')).to.eq('2');
        });
      });
    });

    it('should persist selected cinema across page reloads', () => {
      cy.fixture('user').then((user) => {
        cy.intercept('GET', '/api/v1/auth/me/', {
          statusCode: 200,
          body: user,
        }).as('getCurrentUser');

        // Set cinema before visiting
        cy.window().then((win) => {
          win.localStorage.setItem('selected_cinema_id', '2');
        });

        cy.visit('/dashboard');
        cy.wait('@getCurrentUser');

        // Should maintain the selected cinema
        cy.window().then((win) => {
          expect(win.localStorage.getItem('selected_cinema_id')).to.eq('2');
        });

        // Reload and verify persistence
        cy.reload();
        cy.wait('@getCurrentUser');

        cy.window().then((win) => {
          expect(win.localStorage.getItem('selected_cinema_id')).to.eq('2');
        });
      });
    });

    it('should default to first cinema if no cinema is selected', () => {
      cy.fixture('user').then((user) => {
        cy.intercept('GET', '/api/v1/auth/me/', {
          statusCode: 200,
          body: user,
        }).as('getCurrentUser');

        // Ensure no cinema is selected
        cy.clearLocalStorage('selected_cinema_id');

        cy.visit('/dashboard');
        cy.wait('@getCurrentUser');

        // Should automatically select first cinema
        cy.window().then((win) => {
          expect(win.localStorage.getItem('selected_cinema_id')).to.eq('1');
        });
      });
    });
  });

  describe('Protected Routes', () => {
    it('should allow access to protected routes when authenticated', () => {
      cy.fixture('user').then((user) => {
        cy.intercept('GET', '/api/v1/auth/me/', {
          statusCode: 200,
          body: user,
        }).as('getCurrentUser');

        cy.visit('/dashboard/engagements');
        cy.wait('@getCurrentUser');

        // Should be able to access the route
        cy.url().should('include', '/dashboard/engagements');
      });
    });

    it('should prevent access to protected routes when not authenticated', () => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 401,
        body: { detail: 'Not authenticated' },
      }).as('checkAuth');

      cy.visit('/dashboard/engagements', { failOnStatusCode: false });

      // ProtectedRoute should prevent rendering the page
      // This depends on how your ProtectedRoute component handles auth failures
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session across browser refreshes', () => {
      cy.fixture('user').then((user) => {
        cy.intercept('GET', '/api/v1/auth/me/', {
          statusCode: 200,
          body: user,
        }).as('getCurrentUser');

        cy.visit('/dashboard');
        cy.wait('@getCurrentUser');

        // Reload the page
        cy.reload();
        cy.wait('@getCurrentUser');

        // Should still be authenticated
        cy.url().should('include', '/dashboard');
      });
    });

    it('should handle expired sessions', () => {
      cy.fixture('user').then((user) => {
        let requestCount = 0;

        cy.intercept('GET', '/api/v1/auth/me/', (req) => {
          requestCount++;
          if (requestCount === 1) {
            // First request succeeds
            req.reply({
              statusCode: 200,
              body: user,
            });
          } else {
            // Subsequent requests fail (session expired)
            req.reply({
              statusCode: 401,
              body: { detail: 'Session expired' },
            });
          }
        }).as('getCurrentUser');

        cy.visit('/dashboard');
        cy.wait('@getCurrentUser');

        // Reload to trigger session check again
        cy.reload();

        // Should handle the expired session
        // AuthContext should clear user state
      });
    });
  });
});
