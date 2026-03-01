describe("Signup Page", () => {
  beforeEach(() => {
    cy.visit("/signup");
  });

  it("should display the signup form with all fields", () => {
    cy.contains("Create an account").should("be.visible");
    cy.get("#form-signup-name").should("exist");
    cy.get("#form-signup-email").should("exist");
    cy.get("#form-signup-password").should("exist");
    cy.get("#form-signup-confirm-password").should("exist");
    cy.contains("button", "Create Account").should("exist");
    cy.contains("a", "Sign in").should("have.attr", "href", "/login");
  });

  it("should show validation errors on empty submission", () => {
    cy.contains("button", "Create Account").click();

    cy.get('[data-invalid="true"]').should("have.length.at.least", 1);
  });

  it("should show validation error for short name", () => {
    cy.get("#form-signup-name").type("A");
    cy.get("#form-signup-email").type("test@example.com");
    cy.get("#form-signup-password").type("password123");
    cy.get("#form-signup-confirm-password").type("password123");
    cy.contains("button", "Create Account").click();

    cy.get('[data-invalid="true"]').should("have.length.at.least", 1);
    cy.contains("at least 2 characters").should("be.visible");
  });

  it("should show validation error for name exceeding max length", () => {
    cy.get("#form-signup-name").type("a".repeat(101));
    cy.get("#form-signup-email").type("test@example.com");
    cy.get("#form-signup-password").type("password123");
    cy.get("#form-signup-confirm-password").type("password123");
    cy.contains("button", "Create Account").click();

    cy.get('[data-invalid="true"]').should("have.length.at.least", 1);
    cy.contains("at most 100 characters").should("be.visible");
  });

  it("should show validation error for short password", () => {
    cy.get("#form-signup-name").type("Test User");
    cy.get("#form-signup-email").type("test@example.com");
    cy.get("#form-signup-password").type("short");
    cy.get("#form-signup-confirm-password").type("short");
    cy.contains("button", "Create Account").click();

    cy.get('[data-invalid="true"]').should("have.length.at.least", 1);
    cy.contains("at least 8 characters").should("be.visible");
  });

  it("should show validation error for password exceeding max length", () => {
    cy.get("#form-signup-name").type("Test User");
    cy.get("#form-signup-email").type("test@example.com");
    cy.get("#form-signup-password").type("a".repeat(129));
    cy.get("#form-signup-confirm-password").type("a".repeat(129));
    cy.contains("button", "Create Account").click();

    cy.get('[data-invalid="true"]').should("have.length.at.least", 1);
    cy.contains("at most 128 characters").should("be.visible");
  });

  it("should show validation error when passwords do not match", () => {
    cy.get("#form-signup-name").type("Test User");
    cy.get("#form-signup-email").type("test@example.com");
    cy.get("#form-signup-password").type("password123");
    cy.get("#form-signup-confirm-password").type("different456");
    cy.contains("button", "Create Account").click();

    cy.get('[data-invalid="true"]').should("have.length.at.least", 1);
    cy.contains("do not match").should("be.visible");
  });

  it("should show loading state on submit button while creating account", () => {
    cy.get("#form-signup-name").type("Test User");
    cy.get("#form-signup-email").type("signup-loading@example.com");
    cy.get("#form-signup-password").type("password123");
    cy.get("#form-signup-confirm-password").type("password123");
    cy.contains("button", "Create Account").click();

    cy.contains("button", "Creating account...").should("be.disabled");
  });
});
