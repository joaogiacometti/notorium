describe("Login Page", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("should display the login form with all fields", () => {
    cy.contains("Login to your account").should("be.visible");
    cy.get("#form-login-email").should("exist");
    cy.get("#form-login-password").should("exist");
    cy.contains("button", "Login").should("exist");
    cy.contains("a", "Sign up").should("have.attr", "href", "/signup");
  });

  it("should show validation errors on empty submission", () => {
    cy.contains("button", "Login").click();

    cy.get('[data-invalid="true"]').should("have.length.at.least", 1);
  });

  it("should show validation error for short password", () => {
    cy.get("#form-login-email").type("test@example.com");
    cy.get("#form-login-password").type("short");
    cy.contains("button", "Login").click();

    cy.get('[data-invalid="true"]').should("have.length.at.least", 1);
    cy.contains("at least 8 characters").should("be.visible");
  });

  it("should show validation error for password exceeding max length", () => {
    cy.get("#form-login-email").type("test@example.com");
    cy.get("#form-login-password").type("a".repeat(129));
    cy.contains("button", "Login").click();

    cy.get('[data-invalid="true"]').should("have.length.at.least", 1);
    cy.contains("at most 128 characters").should("be.visible");
  });

  it("should show error toast for invalid credentials", () => {
    cy.get("#form-login-email").type("nonexistent@example.com");
    cy.get("#form-login-password").type("wrongpassword123");
    cy.contains("button", "Login").click();

    cy.get("[data-sonner-toast]", { timeout: 10000 }).should("be.visible");
  });

  it("should show loading state on submit button while logging in", () => {
    cy.get("#form-login-email").type("nonexistent@example.com");
    cy.get("#form-login-password").type("wrongpassword123");
    cy.contains("button", "Login").click();

    cy.contains("button", "Logging in...").should("be.disabled");
  });
});
