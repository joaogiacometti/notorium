describe("Landing Page", () => {
  it("renders the not-found page with a link back home", () => {
    cy.visit("/this-page-does-not-exist", { failOnStatusCode: false });

    cy.contains("h1", "404").should("be.visible");
    cy.contains("a", "Go home").should("have.attr", "href", "/");
  });
});
