/// <reference types="cypress" />

/**
 * Custom command to get element by data-cy attribute
 */
Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy="${value}"]`)
})

/**
 * Custom command to log in via API
 * This performs a real login against the backend API
 */
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.session(
    [username, password],
    () => {
      cy.request({
        method: 'POST',
        url: '/api/v1/auth/login/',
        body: { username, password },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200)
        // Store user data in localStorage if needed
        if (response.body.cinemas && response.body.cinemas.length > 0) {
          window.localStorage.setItem(
            'selected_cinema_id',
            String(response.body.cinemas[0].cinema_id)
          )
        }
      })
    },
    {
      validate() {
        // Validate session by checking current user endpoint
        cy.request({
          method: 'GET',
          url: '/api/v1/auth/me/',
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.eq(200)
        })
      },
    }
  )
})

/**
 * Custom command to log out
 */
Cypress.Commands.add('logout', () => {
  cy.request({
    method: 'POST',
    url: '/api/v1/auth/logout/',
    failOnStatusCode: false,
  }).then(() => {
    // Clear any stored cinema selection
    window.localStorage.removeItem('selected_cinema_id')
  })
})

/**
 * Custom command to set up authenticated session with mock user data
 * This is useful for tests that don't need real backend authentication
 */
Cypress.Commands.add('mockAuthSession', (userData = null) => {
  const defaultUserData = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    cinemas: [
      {
        cinema_id: 1,
        cinema_name: 'Test Cinema',
        role: 'admin',
      },
    ],
  }

  const user = userData || defaultUserData

  // Intercept auth endpoints
  cy.intercept('GET', '/api/v1/auth/me/', {
    statusCode: 200,
    body: user,
  }).as('getCurrentUser')

  // Set selected cinema in localStorage
  if (user.cinemas && user.cinemas.length > 0) {
    window.localStorage.setItem(
      'selected_cinema_id',
      String(user.cinemas[0].cinema_id)
    )
  }
})

/**
 * Custom command to select a cinema
 */
Cypress.Commands.add('selectCinema', (cinemaId: number) => {
  window.localStorage.setItem('selected_cinema_id', String(cinemaId))
})

/**
 * Custom command to wait for API call and check response
 */
Cypress.Commands.add('waitForApi', (alias: string, expectedStatus = 200) => {
  return cy.wait(alias).then((interception) => {
    expect(interception.response?.statusCode).to.eq(expectedStatus)
    return interception
  })
})

// Prevent TypeScript errors
export {}
