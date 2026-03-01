import {
  authenticateWithSession,
  createNote,
  createSubject,
  openNoteDetail,
  openSubjectDetail,
  uniqueValue,
  visitSubjectsPage,
} from "../support/test-helpers";

const onePixelPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7+L5kAAAAASUVORK5CYII=";

function stageOneImageAttachment(fileName: string) {
  cy.get("#form-note-attachments-images").selectFile(
    {
      contents: Cypress.Buffer.from(onePixelPngBase64, "base64"),
      fileName,
      mimeType: "image/png",
      lastModified: Date.now(),
    },
    { force: true },
  );
}

describe("Note Attachments - Free Plan", () => {
  const freeUser = {
    name: "Cypress Attachments Free User",
    email: `cypress-attachments-free-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(freeUser, "free");
    visitSubjectsPage();
  });

  it("shows attachments section and free-plan restriction", () => {
    const subjectName = uniqueValue("Attachments Subject");
    const noteTitle = uniqueValue("Attachments Note");

    createSubject({
      name: subjectName,
      description: "Subject used for attachment restriction test",
    });
    openSubjectDetail(subjectName);
    cy.contains("h2", "Notes").should("be.visible");

    createNote({ title: noteTitle });
    openNoteDetail(noteTitle);
    cy.contains("h2", "Attachments").should("be.visible");

    cy.contains("0 images").should("be.visible");
    cy.contains("Image attachments are not available on the Free plan.").should(
      "be.visible",
    );
    cy.contains("Upgrade your plan to upload images.").should("be.visible");
  });

  it("does not render upload controls on free plan", () => {
    const subjectName = uniqueValue("Upload Controls Subject");
    const noteTitle = uniqueValue("Upload Controls Note");

    createSubject({
      name: subjectName,
      description: "Subject used for hidden upload controls test",
    });
    openSubjectDetail(subjectName);

    createNote({ title: noteTitle });
    openNoteDetail(noteTitle);

    cy.get("#form-note-attachments-images").should("not.exist");
    cy.contains("button", "Upload").should("not.exist");
    cy.contains("button", "Clear").should("not.exist");
    cy.contains("No images attached yet.").should("not.exist");
  });
});

describe("Note Attachments - Pro Plan", () => {
  const proUser = {
    name: "Cypress Attachments Pro User",
    email: `cypress-attachments-pro-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(proUser, "pro");
    visitSubjectsPage();
  });

  it("uploads an image attachment", () => {
    const subjectName = uniqueValue("Pro Attachments Subject");
    const noteTitle = uniqueValue("Pro Attachments Note");
    const fileName = `${uniqueValue("note-image")}.png`;

    createSubject({
      name: subjectName,
      description: "Subject used for attachment upload test",
    });
    openSubjectDetail(subjectName);

    createNote({ title: noteTitle });
    openNoteDetail(noteTitle);

    cy.get("#form-note-attachments-images").should("exist");

    stageOneImageAttachment(fileName);

    cy.contains("Staged (1)").should("be.visible");
    cy.contains(fileName).should("be.visible");

    cy.contains("button", "Upload").click();

    cy.get("[data-sonner-toast]", { timeout: 15000 }).should("be.visible");
    cy.contains("1 image uploaded.").should("be.visible");
    cy.contains("1 image").should("be.visible");
    cy.contains("button", "Remove").should("be.visible");
  });

  it("removes an uploaded image attachment", () => {
    const subjectName = uniqueValue("Remove Attachment Subject");
    const noteTitle = uniqueValue("Remove Attachment Note");
    const fileName = `${uniqueValue("remove-image")}.png`;

    createSubject({
      name: subjectName,
      description: "Subject used for attachment removal test",
    });
    openSubjectDetail(subjectName);

    createNote({ title: noteTitle });
    openNoteDetail(noteTitle);

    stageOneImageAttachment(fileName);
    cy.contains("button", "Upload").click();
    cy.contains("1 image uploaded.", { timeout: 15000 }).should("be.visible");

    cy.contains("button", "Remove").first().click();

    cy.get('[role="dialog"]').within(() => {
      cy.contains("Remove Attachment").should("be.visible");
      cy.contains("button", "Remove").click();
    });

    cy.contains("Attachment removed.", { timeout: 10000 }).should("be.visible");
    cy.contains("0 images").should("be.visible");
    cy.contains("button", "Remove").should("not.exist");
  });
});
