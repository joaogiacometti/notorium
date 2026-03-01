describe("Landing Page", () => {
  it("should display the CTA links", () => {
    cy.visit("/");

    cy.contains("a", "Get Started").should("have.attr", "href", "/signup");
    cy.contains("a", "Sign In").should("have.attr", "href", "/login");
  });

  it("should render the not-found page with heading and home link", () => {
    cy.visit("/this-page-does-not-exist", { failOnStatusCode: false });

    cy.contains("h1", "404").should("be.visible");
    cy.contains("Page not found").should("be.visible");
    cy.contains("a", "Go home").should("have.attr", "href", "/");
  });
});
