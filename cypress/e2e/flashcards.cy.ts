import {
  authenticateWithSession,
  createSubject,
  openSubjectDetail,
  uniqueValue,
  visitSubjectsPage,
} from "../support/test-helpers";

function expandFlashcards() {
  cy.contains('[data-slot="accordion-trigger"]', "Show flashcards").click();
}

describe("Flashcards", () => {
  const testUser = {
    name: "Cypress Flashcards User",
    email: `cypress-flashcards-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser, "pro");
    visitSubjectsPage();
  });

  it("creates and reads a flashcard", () => {
    const subjectName = uniqueValue("Flashcards Subject");
    const front = uniqueValue("What is inertia?");
    const back = "Resistance of an object to change in motion.";

    createSubject({
      name: subjectName,
      description: "Subject used for flashcard creation",
    });
    openSubjectDetail(subjectName);
    cy.contains("h2", "Flashcards").should("be.visible");
    cy.contains("Review Due Cards").should("not.exist");
    cy.contains("Expand to load your flashcards.").should("be.visible");
    expandFlashcards();

    cy.get("#btn-create-flashcard").click();
    cy.get('[role="dialog"]').should("be.visible");

    cy.get("#form-create-flashcard-front").type(front);
    cy.get("#form-create-flashcard-back").type(back);
    cy.contains('[role="dialog"] button', "Create Flashcard").click();

    cy.get('[role="dialog"]').should("not.exist");
    cy.contains('[data-slot="table-row"]', front).should("be.visible");
  });

  it("validates required front before creating", () => {
    const subjectName = uniqueValue("Flashcards Validation Subject");
    const back = "A valid answer";

    createSubject({
      name: subjectName,
      description: "Subject used for flashcard validation",
    });
    openSubjectDetail(subjectName);
    expandFlashcards();

    cy.get("#btn-create-flashcard").click();
    cy.get('[role="dialog"]').should("be.visible");

    cy.get("#form-create-flashcard-back").type(back);
    cy.contains('[role="dialog"] button', "Create Flashcard").click();

    cy.contains("Flashcard front is required.").should("be.visible");
    cy.get('[role="dialog"]').should("be.visible");
  });

  it("edits a flashcard", () => {
    const subjectName = uniqueValue("Flashcards Edit Subject");
    const initialFront = uniqueValue("Initial front");
    const updatedFront = uniqueValue("Updated front");
    const updatedBack = "Updated answer";

    createSubject({
      name: subjectName,
      description: "Subject used for flashcard editing",
    });
    openSubjectDetail(subjectName);
    expandFlashcards();

    cy.get("#btn-create-flashcard").click();
    cy.get("#form-create-flashcard-front").type(initialFront);
    cy.get("#form-create-flashcard-back").type("Initial answer");
    cy.contains('[role="dialog"] button', "Create Flashcard").click();

    cy.contains('[data-slot="table-row"]', initialFront).within(() => {
      cy.get('button[aria-label="Open flashcard actions"]').click();
    });

    cy.contains('[role="menuitem"]', "Edit").click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.get("#form-edit-flashcard-front").clear().type(updatedFront);
    cy.get("#form-edit-flashcard-back").clear().type(updatedBack);
    cy.contains('[role="dialog"] button', "Save Changes").click();

    cy.get('[role="dialog"]').should("not.exist");
    cy.contains('[data-slot="table-row"]', updatedFront).should("be.visible");
  });

  it("deletes a flashcard", () => {
    const subjectName = uniqueValue("Flashcards Delete Subject");
    const front = uniqueValue("Disposable flashcard");

    createSubject({
      name: subjectName,
      description: "Subject used for flashcard deletion",
    });
    openSubjectDetail(subjectName);
    expandFlashcards();

    cy.get("#btn-create-flashcard").click();
    cy.get("#form-create-flashcard-front").type(front);
    cy.get("#form-create-flashcard-back").type("Disposable answer");
    cy.contains('[role="dialog"] button', "Create Flashcard").click();

    cy.contains('[data-slot="table-row"]', front).within(() => {
      cy.get('button[aria-label="Open flashcard actions"]').click();
    });

    cy.contains('[role="menuitem"]', "Delete").click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains("Delete Flashcard").should("be.visible");
      cy.contains("button", "Delete").click();
    });

    cy.contains('[data-slot="table-row"]', front).should("not.exist");
    cy.contains("No flashcards yet").should("be.visible");
  });
});
