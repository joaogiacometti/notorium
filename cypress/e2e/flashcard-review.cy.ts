import {
  authenticateWithSession,
  createSubject,
  openSubjectDetail,
  uniqueValue,
  visitSubjectsPage,
} from "../support/test-helpers";

describe("Flashcard Review", () => {
  const testUser = {
    name: "Cypress Flashcard Review User",
    email: `cypress-flashcard-review-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  function createFlashcard(front: string, back: string) {
    cy.contains('[data-slot="accordion-trigger"]', "Show flashcards").click();
    cy.get("#btn-create-flashcard").click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.get("#form-create-flashcard-front").type(front);
    cy.get("#form-create-flashcard-back").type(back);
    cy.contains('[role="dialog"] button', "Create Flashcard").click();
    cy.get('[role="dialog"]').should("not.exist");
  }

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser);
    visitSubjectsPage();
  });

  it("reviews a due flashcard using reveal then grade", () => {
    const subjectName = uniqueValue("Review Subject");
    const front = uniqueValue("What is momentum?");
    const back = "Mass times velocity.";

    createSubject({
      name: subjectName,
      description: "Subject for review flow",
    });
    openSubjectDetail(subjectName);
    createFlashcard(front, back);

    cy.visit("/flashcards/review");
    cy.contains("h1", "Flashcard Review").should("be.visible");
    cy.contains(front).should("be.visible");

    cy.contains("button", "Show Answer").click();
    cy.contains(back).should("be.visible");

    cy.contains("button", "Good").click();
    cy.contains("All caught up", { timeout: 10000 }).should("be.visible");
  });

  it("shows all grading options after revealing answer", () => {
    const subjectName = uniqueValue("Review Buttons Subject");

    createSubject({
      name: subjectName,
      description: "Subject for review options",
    });
    openSubjectDetail(subjectName);
    createFlashcard(uniqueValue("Front"), "Back");

    cy.visit("/flashcards/review");
    cy.contains("button", "Show Answer").click();

    cy.contains("button", "Again").should("be.visible");
    cy.contains("button", "Hard").should("be.visible");
    cy.contains("button", "Good").should("be.visible");
    cy.contains("button", "Easy").should("be.visible");
  });

  it("shows empty state when no cards are due", () => {
    cy.visit("/flashcards/review");

    cy.contains("All caught up").should("be.visible");
    cy.contains("There are no due flashcards to review.").should("be.visible");
  });
});
