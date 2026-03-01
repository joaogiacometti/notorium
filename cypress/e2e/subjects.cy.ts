import {
  authenticateWithSession,
  uniqueValue,
  visitSubjectsPage,
} from "../support/test-helpers";

interface ModulesState {
  notes: boolean;
  assessments: boolean;
  attendance: boolean;
}

interface SubjectInput {
  name: string;
  description: string;
  modules?: ModulesState;
}

describe("Subjects", () => {
  const testUser = {
    name: "Cypress Subjects User",
    email: `cypress-subjects-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  function setModuleSwitches(modules: ModulesState) {
    const values = [modules.notes, modules.assessments, modules.attendance];

    values.forEach((value, index) => {
      cy.get('[role="dialog"] [data-slot="switch"]')
        .eq(index)
        .then(($switch) => {
          const isChecked = $switch.attr("data-state") === "checked";

          if (isChecked !== value) {
            cy.wrap($switch).click();
          }
        });
    });
  }

  function createSubject(input: SubjectInput) {
    cy.get("#btn-create-subject").click();
    cy.get('[role="dialog"]').should("be.visible");

    cy.get("#form-create-subject-name").clear().type(input.name);
    cy.get("#form-create-subject-description").clear().type(input.description);

    if (input.modules) {
      setModuleSwitches(input.modules);
    }

    cy.contains('[role="dialog"] button', "Create Subject").click();
    cy.get('[role="dialog"]').should("not.exist");
  }

  function openSubjectDetail(name: string) {
    cy.contains('[data-slot="card-title"]', name).click();
    cy.url({ timeout: 10000 }).should("match", /\/subjects\/[^/]+$/);
  }

  function editSubject(input: SubjectInput) {
    cy.contains("button", "Edit").click();
    cy.get('[role="dialog"]').should("be.visible");

    cy.get("#form-edit-subject-name").clear().type(input.name);
    cy.get("#form-edit-subject-description").clear().type(input.description);

    if (input.modules) {
      setModuleSwitches(input.modules);
    }

    cy.contains('[role="dialog"] button', "Save Changes").click();
    cy.get('[role="dialog"]').should("not.exist");
  }

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser);
    visitSubjectsPage();
  });

  it("creates a subject from the create dialog", () => {
    const name = uniqueValue("Calculus");
    const description = uniqueValue("Subject description");

    createSubject({
      name,
      description,
    });

    cy.contains('[data-slot="card-title"]', name).should("be.visible");
    cy.contains(description).should("be.visible");
  });

  it("validates required subject name before creating", () => {
    const name = uniqueValue("Biology");

    cy.get("#btn-create-subject").click();
    cy.get('[role="dialog"]').should("be.visible");

    cy.contains('[role="dialog"] button', "Create Subject").click();
    cy.contains("Subject name is required.").should("be.visible");

    cy.get("#form-create-subject-name").type(name);
    cy.contains('[role="dialog"] button', "Create Subject").click();

    cy.get('[role="dialog"]').should("not.exist");
    cy.contains('[data-slot="card-title"]', name).should("be.visible");
  });

  it("edits a subject and updates module sections", () => {
    const initialName = uniqueValue("History");
    const updatedName = uniqueValue("Modern History");

    createSubject({
      name: initialName,
      description: "Initial history description",
      modules: {
        notes: false,
        assessments: false,
        attendance: false,
      },
    });

    openSubjectDetail(initialName);

    cy.contains("h2", "Attendance").should("not.exist");
    cy.contains("h2", "Assessments").should("not.exist");
    cy.contains("h2", "Notes").should("not.exist");

    editSubject({
      name: updatedName,
      description: "Updated history description",
      modules: {
        notes: true,
        assessments: true,
        attendance: true,
      },
    });

    cy.contains("h1", updatedName).should("be.visible");
    cy.contains("Updated history description").should("be.visible");
    cy.contains("h2", "Attendance").should("be.visible");
    cy.contains("h2", "Assessments").should("be.visible");
    cy.contains("h2", "Notes").should("be.visible");
  });

  it("deletes a subject from subject detail", () => {
    const name = uniqueValue("Physics");

    createSubject({
      name,
      description: "Physics description",
    });

    openSubjectDetail(name);

    cy.contains("button", "Delete").click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains("Delete Subject").should("be.visible");
      cy.contains("button", "Delete").click();
    });

    cy.url({ timeout: 10000 }).should("include", "/subjects");
    cy.contains('[data-slot="card-title"]', name).should("not.exist");
  });
});
