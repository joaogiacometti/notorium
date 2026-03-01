import {
  authenticateWithSession,
  createNote,
  createSubject,
  openNoteDetail,
  openSubjectDetail,
  uniqueValue,
  visitSubjectsPage,
} from "../support/test-helpers";

describe("Notes", () => {
  const testUser = {
    name: "Cypress Notes User",
    email: `cypress-notes-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser);
    visitSubjectsPage();
  });

  it("creates and reads a note", () => {
    const subjectName = uniqueValue("Subject for notes");
    const noteTitle = uniqueValue("Lecture note");

    createSubject({
      name: subjectName,
      description: "Subject used for note creation",
    });
    openSubjectDetail(subjectName);
    cy.contains("h2", "Notes").should("be.visible");

    createNote({ title: noteTitle });

    cy.contains('[data-slot="card-title"]', noteTitle).should("be.visible");

    openNoteDetail(noteTitle);
    cy.contains("h1", noteTitle).should("be.visible");
  });

  it("validates required note title before creating", () => {
    const subjectName = uniqueValue("Validation subject");
    const noteTitle = uniqueValue("Validated note");

    createSubject({
      name: subjectName,
      description: "Subject used for note validation",
    });
    openSubjectDetail(subjectName);
    cy.contains("h2", "Notes").should("be.visible");

    cy.get("#btn-create-note").click();
    cy.get('[role="dialog"]').should("be.visible");

    cy.contains('[role="dialog"] button', "Create Note").click();
    cy.contains("Note title is required.").should("be.visible");

    cy.get("#form-create-note-title").type(noteTitle);
    cy.contains('[role="dialog"] button', "Create Note").click();

    cy.get('[role="dialog"]').should("not.exist");
    cy.contains('[data-slot="card-title"]', noteTitle).should("be.visible");
  });

  it("edits a note title", () => {
    const subjectName = uniqueValue("Edit notes subject");
    const initialTitle = uniqueValue("Initial note");
    const updatedTitle = uniqueValue("Updated note");

    createSubject({
      name: subjectName,
      description: "Subject used for note editing",
    });
    openSubjectDetail(subjectName);

    createNote({ title: initialTitle });
    openNoteDetail(initialTitle);

    cy.contains("button", "Edit").click();
    cy.get('[role="dialog"]').should("be.visible");

    cy.get("#form-edit-note-title").clear().type(updatedTitle);
    cy.contains('[role="dialog"] button', "Save Changes").click();

    cy.get('[role="dialog"]').should("not.exist");
    cy.contains("h1", updatedTitle).should("be.visible");
  });

  it("deletes a note from note detail", () => {
    const subjectName = uniqueValue("Delete notes subject");
    const noteTitle = uniqueValue("Disposable note");

    createSubject({
      name: subjectName,
      description: "Subject used for note deletion",
    });
    openSubjectDetail(subjectName);

    createNote({ title: noteTitle });
    openNoteDetail(noteTitle);

    cy.contains("button", "Delete").click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains("Delete Note").should("be.visible");
      cy.contains("button", "Delete").click();
    });

    cy.url({ timeout: 10000 }).should("match", /\/subjects\/[^/]+$/);
    cy.contains('[data-slot="card-title"]', noteTitle).should("not.exist");
    cy.contains("No notes yet").should("be.visible");
  });
});
