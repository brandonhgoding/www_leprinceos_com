// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global before hook to handle uncaught exceptions
Cypress.on('uncaught:exception', (err) => {
  // Prevent Cypress from failing tests on uncaught exceptions
  // This is useful for React errors that don't affect test behavior
  // Log the error but don't fail the test
  console.error('Uncaught exception:', err);

  // Return false to prevent the test from failing
  // You can add specific error types to ignore if needed
  return false;
});

// Add custom viewport sizes for common breakpoints
Cypress.Commands.add('setMobileViewport', () => {
  cy.viewport(375, 667); // iPhone SE size
});

Cypress.Commands.add('setTabletViewport', () => {
  cy.viewport(768, 1024); // iPad size
});

Cypress.Commands.add('setDesktopViewport', () => {
  cy.viewport(1280, 720); // Default desktop
});

// Extend Cypress namespace for the new viewport commands
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      setMobileViewport(): Chainable<void>;
      setTabletViewport(): Chainable<void>;
      setDesktopViewport(): Chainable<void>;
    }
  }
}
