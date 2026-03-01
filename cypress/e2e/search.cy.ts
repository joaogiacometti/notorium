import {
  authenticateWithSession,
  createNote,
  createSubject,
  openSubjectDetail,
  uniqueValue,
  visitSubjectsPage,
} from "../support/test-helpers";

describe("Global Search", () => {
  const testUser = {
    name: "Cypress Search User",
    email: `cypress-search-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  function openSearchDialog() {
    cy.contains("button", "Search...").click();
    cy.get('[role="dialog"]').should("be.visible");
  }

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser);
    visitSubjectsPage();
  });

  it("navigates to a subject from global search", () => {
    const subjectName = uniqueValue("Search Subject");

    createSubject({
      name: subjectName,
      description: "Subject indexed by search",
    });

    openSearchDialog();
    cy.get('[role="dialog"]').within(() => {
      cy.get('input[placeholder="Search subjects and notes..."]').type(
        subjectName,
      );
      cy.contains('[data-slot="command-item"]', subjectName).click();
    });
    cy.url({ timeout: 10000 }).should("match", /\/subjects\/[^/]+$/);
    cy.contains("h1", subjectName).should("be.visible");
  });

  it("navigates to a note from global search", () => {
    const subjectName = uniqueValue("Search Notes Subject");
    const noteTitle = uniqueValue("Searchable Note");

    createSubject({
      name: subjectName,
      description: "Subject for searchable note",
    });
    openSubjectDetail(subjectName);
    createNote({ title: noteTitle });

    visitSubjectsPage();
    openSearchDialog();
    cy.get('[role="dialog"]').within(() => {
      cy.get('input[placeholder="Search subjects and notes..."]').type(
        noteTitle,
      );
      cy.contains('[data-slot="command-item"]', noteTitle).click();
    });
    cy.url({ timeout: 10000 }).should("match", /\/notes\/[^/]+$/);
    cy.contains("h1", noteTitle).should("be.visible");
  });
});
