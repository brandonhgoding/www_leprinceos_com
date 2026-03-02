/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to log in via API
     * @example cy.login('admin', 'password123')
     */
    login(username: string, password: string): Chainable<void>;

    /**
     * Custom command to log out
     * @example cy.logout()
     */
    logout(): Chainable<void>;

    /**
     * Custom command to set up authenticated session with mock user data
     * @example cy.mockAuthSession()
     */
    mockAuthSession(userData?: any): Chainable<void>;

    /**
     * Custom command to select a cinema in the context
     * @example cy.selectCinema(1)
     */
    selectCinema(cinemaId: number): Chainable<void>;

    /**
     * Custom command to get element by data-cy attribute
     * @example cy.dataCy('submit-button')
     */
    dataCy(value: string): Chainable<JQuery<HTMLElement>>;

    /**
     * Custom command to wait for API call and check response
     * @example cy.waitForApi('@getEngagements', 200)
     */
    waitForApi(alias: string, expectedStatus?: number): Chainable<any>;
  }
}
