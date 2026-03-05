import {
  authenticateWithSession,
  createSubject,
  openSubjectDetail,
  signUp,
  uniqueValue,
} from "../support/test-helpers";

describe("Profile", () => {
  const testUser = {
    name: "Cypress Profile User",
    email: `cypress-profile-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser);
    cy.visit("/profile");
    cy.url({ timeout: 10000 }).should("include", "/profile");
  });

  it("updates profile name", () => {
    const updatedName = uniqueValue("Updated Name");

    cy.get("#form-profile-name").clear().type(updatedName);
    cy.contains("button", "Save Changes").click();

    cy.get("[data-sonner-toast]", { timeout: 10000 }).should("be.visible");
    cy.contains("Profile updated.").should("be.visible");
    cy.get("#form-profile-name").should("have.value", updatedName);
  });

  it("validates profile name minimum length", () => {
    cy.get("#form-profile-name").clear().type("A");
    cy.contains("button", "Save Changes").click();

    cy.contains("Name must be at least 2 characters.").should("be.visible");
    cy.url().should("include", "/profile");
  });
});

describe("Profile Account Deletion", () => {
  const deletionUser = {
    name: "Cypress Delete User",
    email: `cypress-delete-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  it("deletes account and redirects to login", () => {
    cy.viewport(1280, 720);

    signUp(deletionUser);

    cy.visit("/profile");
    cy.contains("button", "Delete Account").click();

    cy.get('[role="dialog"]').within(() => {
      cy.contains("Delete Account").should("be.visible");
      cy.contains("button", "Delete Account").click();
    });

    cy.url({ timeout: 10000 }).should("include", "/login");
  });
});

describe("Profile Data Transfer", () => {
  const freePlanUser = {
    name: "Cypress Profile Transfer Free User",
    email: `cypress-profile-transfer-free-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  const proPlanUser = {
    name: "Cypress Profile Transfer Pro User",
    email: `cypress-profile-transfer-pro-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  it("shows data-transfer section as locked on free plan", () => {
    cy.viewport(1280, 720);
    authenticateWithSession(freePlanUser, "free");
    cy.visit("/profile");
    cy.url({ timeout: 10000 }).should("include", "/profile");

    cy.contains('[data-slot="card"]', "Data Transfer").within(() => {
      cy.contains("Data transfer is not available on the Free plan.").should(
        "be.visible",
      );
      cy.contains("Upgrade your plan to import and export data.").should(
        "not.exist",
      );
      cy.contains("button", "Export Data").should("not.exist");
      cy.contains("button", "Import Data").should("not.exist");
    });
  });

  it("exports template without flashcards", () => {
    cy.viewport(1280, 720);
    authenticateWithSession(proPlanUser, "pro");
    cy.visit("/subjects");

    const subjectName = uniqueValue("Template Export Subject");
    const flashcardFront = uniqueValue("Template Export Front");
    const templateDate = new Date().toISOString().slice(0, 10);
    const downloadPath = `cypress/downloads/notorium-export-template-${templateDate}.json`;

    createSubject({
      name: subjectName,
      description: "Subject for template export",
    });
    openSubjectDetail(subjectName);
    cy.contains('[data-slot="accordion-trigger"]', "Show flashcards").click();
    cy.get("#btn-create-flashcard").click();
    cy.get("#form-create-flashcard-front").type(flashcardFront);
    cy.get("#form-create-flashcard-back").type("Template export answer");
    cy.contains('[role="dialog"] button', "Create Flashcard").click();
    cy.contains('[data-slot="table-row"]', flashcardFront).should("be.visible");

    cy.visit("/profile");
    cy.contains("button", "Export Data").click();
    cy.contains('[role="menuitem"]', "Export Template").click();

    cy.readFile(downloadPath, { timeout: 20000 }).should((payload) => {
      const exportedSubject = payload.subjects.find(
        (subject: { name: string }) => subject.name === subjectName,
      );

      expect(exportedSubject).to.not.be.undefined;
      expect(exportedSubject.flashcards).to.deep.equal([]);
      expect(exportedSubject.notes).to.deep.equal([]);
      expect(exportedSubject.attendanceMisses).to.deep.equal([]);
    });
  });
});
