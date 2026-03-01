import {
  authenticateWithSession,
  signUp,
  uniqueValue,
} from "../support/test-helpers";

describe("Profile", () => {
  const testUser = {
    name: "Cypress Profile User",
    email: `cypress-profile-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser);
    cy.visit("/profile");
    cy.url({ timeout: 10000 }).should("include", "/profile");
  });

  it("updates profile name", () => {
    const updatedName = uniqueValue("Updated Name");

    cy.get("#form-profile-name").clear().type(updatedName);
    cy.contains("button", "Save Changes").click();

    cy.get("[data-sonner-toast]", { timeout: 10000 }).should("be.visible");
    cy.contains("Profile updated.").should("be.visible");
    cy.get("#form-profile-name").should("have.value", updatedName);
  });

  it("validates profile name minimum length", () => {
    cy.get("#form-profile-name").clear().type("A");
    cy.contains("button", "Save Changes").click();

    cy.contains("Name must be at least 2 characters.").should("be.visible");
    cy.url().should("include", "/profile");
  });
});

describe("Profile Account Deletion", () => {
  const deletionUser = {
    name: "Cypress Delete User",
    email: `cypress-delete-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  it("deletes account and redirects to login", () => {
    cy.viewport(1280, 720);

    signUp(deletionUser);

    cy.visit("/profile");
    cy.contains("button", "Delete Account").click();

    cy.get('[role="dialog"]').within(() => {
      cy.contains("Delete Account").should("be.visible");
      cy.contains("button", "Delete Account").click();
    });

    cy.url({ timeout: 10000 }).should("include", "/login");
  });
});
