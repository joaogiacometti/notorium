describe("Landing Page", () => {
  it("renders the not-found page", () => {
    cy.visit("/this-page-does-not-exist", { failOnStatusCode: false });

    cy.contains("h1", "404").should("be.visible");
    cy.contains(/this page could not be found\.|page not found/i).should(
      "be.visible",
    );
  });
});
