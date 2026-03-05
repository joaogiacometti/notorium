import {
  authenticateWithSession,
  createSubject,
  openFlashcardDetail,
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
    authenticateWithSession(testUser);
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
    openFlashcardDetail(front);
    cy.contains("h1", front).should("be.visible");
    cy.contains("h2", "Front").should("not.exist");
    cy.contains("h2", "Back").should("be.visible");
    cy.contains("p", back).should("be.visible");
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

  it("edits a flashcard from flashcard detail", () => {
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

    openFlashcardDetail(initialFront);
    cy.contains("button", "Edit").click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.get("#form-edit-flashcard-front").clear().type(updatedFront);
    cy.get("#form-edit-flashcard-back").clear().type(updatedBack);
    cy.contains('[role="dialog"] button', "Save Changes").click();

    cy.get('[role="dialog"]').should("not.exist");
    cy.contains("h1", updatedFront).should("be.visible");
    cy.contains("p", updatedBack).should("be.visible");
  });

  it("resets a flashcard from flashcard detail", () => {
    const subjectName = uniqueValue("Flashcards Reset Subject");
    const front = uniqueValue("Reset flashcard");

    createSubject({
      name: subjectName,
      description: "Subject used for flashcard reset",
    });
    openSubjectDetail(subjectName);
    expandFlashcards();

    cy.get("#btn-create-flashcard").click();
    cy.get("#form-create-flashcard-front").type(front);
    cy.get("#form-create-flashcard-back").type("Answer before reset");
    cy.contains('[role="dialog"] button', "Create Flashcard").click();

    openFlashcardDetail(front);
    cy.contains("button", "Reset").click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains("Reset Flashcard").should("be.visible");
      cy.contains("button", "Reset").click();
    });

    cy.get('[role="dialog"]').should("not.exist");
    cy.contains("h1", front).should("be.visible");
  });

  it("deletes a flashcard from flashcard detail", () => {
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

    openFlashcardDetail(front);
    cy.contains("button", "Delete").click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains("Delete Flashcard").should("be.visible");
      cy.contains("button", "Delete").click();
    });

    cy.url({ timeout: 10000 }).should("match", /\/subjects\/[^/]+$/);
    cy.contains("h2", "Flashcards", { timeout: 10000 }).should("be.visible");
    expandFlashcards();
    cy.contains("No flashcards yet", { timeout: 10000 }).should("be.visible");
  });
});
