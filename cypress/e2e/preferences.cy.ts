import { authenticateWithSession } from "../support/test-helpers";

function openPreferencesDialog() {
  cy.get('[data-testid="account-menu-trigger"]').click();
  cy.get('[data-testid="account-menu-preferences"]').click();
  cy.get('[role="dialog"]').should("be.visible");
}

describe("Preferences Menu", () => {
  const testUser = {
    name: "Cypress Preferences User",
    email: `cypress-preferences-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser);
    cy.visit("/en/subjects");
    cy.url({ timeout: 10000 }).should("include", "/subjects");
  });

  it("opens preferences from the account menu", () => {
    openPreferencesDialog();
    cy.contains('[role="dialog"]', /Language|Idioma/).should("be.visible");
    cy.contains('[role="dialog"]', /Theme|Tema/).should("be.visible");
  });

  it("switches language between English and Portuguese", () => {
    openPreferencesDialog();
    cy.contains('[role="dialog"] button', "Portuguese").click();

    cy.url({ timeout: 10000 }).should("include", "/pt");
    cy.get("html").should("have.attr", "lang", "pt");
    cy.get('[data-testid="account-menu-trigger"]').click();
    cy.get('[data-testid="account-menu-preferences"]')
      .should("be.visible")
      .contains(/Prefer.ncias/);
    cy.get('[data-testid="account-menu-preferences"]').click();
    cy.contains('[role="dialog"] button', /Ingl.s|English/).click();

    cy.url({ timeout: 10000 }).should("include", "/en");
    cy.get("html").should("have.attr", "lang", "en");
    cy.get('[data-testid="account-menu-trigger"]').click();
    cy.get('[data-testid="account-menu-preferences"]')
      .should("be.visible")
      .contains("Preferences");
  });

  it("switches theme between dark and light modes", () => {
    openPreferencesDialog();
    cy.contains('[role="dialog"] button', "Dark").click();

    cy.get("html").should("have.class", "dark");

    cy.contains('[role="dialog"] button', "Light").click();
    cy.get("html").should("not.have.class", "dark");
  });
});
