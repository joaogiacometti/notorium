describe("Login Page", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("shows validation error on empty submission", () => {
    cy.contains("button", "Login").click();

    cy.get('[data-invalid="true"]').should("have.length.at.least", 1);
    cy.url().should("include", "/login");
  });

  it("shows error toast for invalid credentials", () => {
    cy.get("#form-login-email").type("nonexistent@example.com");
    cy.get("#form-login-password").type("wrongpassword123");
    cy.contains("button", "Login").click();

    cy.get("[data-sonner-toast]", { timeout: 10000 }).should("be.visible");
    cy.url().should("include", "/login");
  });
});
