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
    authenticateWithSession(testUser, "pro");
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

  it("archives a subject from subject detail", () => {
    const name = uniqueValue("Physics");

    createSubject({
      name,
      description: "Physics description",
    });

    openSubjectDetail(name);

    cy.contains("button", "Archive").click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains("Archive Subject").should("be.visible");
      cy.contains("button", "Archive").click();
    });

    cy.url({ timeout: 10000 }).should("include", "/subjects");
    cy.contains('[data-slot="card-title"]', name).should("not.exist");
  });

  it("shows archived subjects on dedicated page and restores one", () => {
    const name = uniqueValue("Archive Restore");

    createSubject({
      name,
      description: "Archive and restore flow",
    });

    openSubjectDetail(name);

    cy.contains("button", "Archive").click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains("Archive Subject").should("be.visible");
      cy.contains("button", "Archive").click();
    });

    cy.url({ timeout: 10000 }).should("include", "/subjects");
    cy.contains('[data-slot="card-title"]', name).should("not.exist");

    cy.contains("a", "Archived").click();
    cy.url({ timeout: 10000 }).should("include", "/subjects/archived");
    cy.contains('[data-slot="card-title"]', name).should("be.visible");

    cy.contains('[data-slot="card"]', name).within(() => {
      cy.contains("button", "Restore").click();
    });

    cy.contains("a", "Back to Subjects").click();
    cy.contains('[data-slot="card-title"]', name).should("be.visible");
    cy.contains("a", "Archived").click();
    cy.url({ timeout: 10000 }).should("include", "/subjects/archived");
    cy.contains('[data-slot="card-title"]', name).should("not.exist");
  });

  it("deletes an archived subject permanently", () => {
    const name = uniqueValue("Archive Delete");

    createSubject({
      name,
      description: "Archive then delete permanently",
    });

    openSubjectDetail(name);

    cy.contains("button", "Archive").click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains("button", "Archive").click();
    });

    cy.contains("a", "Archived").click();
    cy.url({ timeout: 10000 }).should("include", "/subjects/archived");
    cy.contains('[data-slot="card-title"]', name).should("be.visible");

    cy.contains('[data-slot="card"]', name).within(() => {
      cy.contains("button", "Delete").click();
    });

    cy.get('[role="dialog"]').within(() => {
      cy.contains("Delete Subject").should("be.visible");
      cy.contains("button", "Delete").click();
    });

    cy.contains('[data-slot="card-title"]', name).should("not.exist");
    cy.contains("a", "Back to Subjects").click();
    cy.contains('[data-slot="card-title"]', name).should("not.exist");
  });

  it("counts archived subjects toward free plan subject limit", () => {
    const limitUser = {
      name: "Cypress Subjects Limit User",
      email: `cypress-subjects-limit-${Date.now()}@test.com`,
      password: "TestPassword123!",
    };

    authenticateWithSession(limitUser);
    visitSubjectsPage();

    const subjects = Array.from({ length: 5 }, (_, index) => ({
      name: uniqueValue(`Limit Subject ${index + 1}`),
      description: `Limit subject ${index + 1}`,
    }));

    subjects.forEach((subjectInput) => {
      createSubject(subjectInput);
      cy.contains('[data-slot="card-title"]', subjectInput.name).should(
        "be.visible",
      );
    });

    openSubjectDetail(subjects[0].name);
    cy.contains("button", "Archive").click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains("button", "Archive").click();
    });

    cy.url({ timeout: 10000 }).should("include", "/subjects");
    cy.get("#btn-create-subject").should("be.disabled");
  });
});
