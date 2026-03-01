describe("Auth Flow", () => {
  const testUser = {
    name: "Cypress Test User",
    email: `cypress-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  it("should sign up, get redirected, then log out and log back in", () => {
    cy.viewport(1280, 720);

    cy.visit("/signup");
    cy.get("#form-signup-name").type(testUser.name);
    cy.get("#form-signup-email").type(testUser.email);
    cy.get("#form-signup-password").type(testUser.password);
    cy.get("#form-signup-confirm-password").type(testUser.password);
    cy.contains("button", "Create Account").click();

    cy.url({ timeout: 10000 }).should("include", "/subjects");

    cy.visit("/login");
    cy.url().should("not.include", "/login");

    cy.visit("/signup");
    cy.url().should("not.include", "/signup");

    cy.visit("/");
    cy.url().should("include", "/subjects");

    cy.contains("button", testUser.name).click();
    cy.contains("Logout").click();

    cy.url({ timeout: 10000 }).should("include", "/login");

    cy.get("#form-login-email").type(testUser.email);
    cy.get("#form-login-password").type(testUser.password);
    cy.contains("button", "Login").click();

    cy.url({ timeout: 10000 }).should("include", "/subjects");
  });

  it("should show error when signing up with an already registered email", () => {
    cy.visit("/signup");
    cy.get("#form-signup-name").type(testUser.name);
    cy.get("#form-signup-email").type(testUser.email);
    cy.get("#form-signup-password").type(testUser.password);
    cy.get("#form-signup-confirm-password").type(testUser.password);
    cy.contains("button", "Create Account").click();

    cy.get("[data-sonner-toast]", { timeout: 10000 }).should("be.visible");
    cy.url().should("include", "/signup");
  });
});

describe("Protected Routes", () => {
  it("should redirect unauthenticated users from /subjects to /login", () => {
    cy.visit("/subjects");

    cy.url({ timeout: 10000 }).should("include", "/login");
  });

  it("should redirect unauthenticated users from /profile to /login", () => {
    cy.visit("/profile");

    cy.url({ timeout: 10000 }).should("include", "/login");
  });

  it("should redirect unauthenticated users from /assessments to /login", () => {
    cy.visit("/assessments");

    cy.url({ timeout: 10000 }).should("include", "/login");
  });
});
