describe("Signup Page", () => {
  beforeEach(() => {
    cy.visit("/signup");
  });

  it("shows validation errors on empty submission", () => {
    cy.contains("button", "Create Account").click();

    cy.get('[data-invalid="true"]').should("have.length.at.least", 1);
    cy.url().should("include", "/signup");
  });
});
