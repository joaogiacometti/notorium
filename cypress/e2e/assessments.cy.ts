import {
  authenticateWithSession,
  createSubject,
  openSubjectDetail,
  uniqueValue,
  visitSubjectsPage,
} from "../support/test-helpers";

interface AssessmentInput {
  title: string;
  description?: string;
  dueDate?: string;
  score?: string;
  weight?: string;
}

describe("Assessments", () => {
  const testUser = {
    name: "Cypress Assessments User",
    email: `cypress-assessments-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  function createAssessment(input: AssessmentInput) {
    cy.contains("button", "Add Assessment").click();
    cy.get('[role="dialog"]').should("be.visible");

    cy.get("#form-create-assessment-title").clear().type(input.title);

    if (input.description) {
      cy.get("#form-create-assessment-description")
        .clear()
        .type(input.description);
    }

    if (input.dueDate) {
      cy.get("#form-create-assessment-due-date").clear().type(input.dueDate);
    }

    if (input.score) {
      cy.get("#form-create-assessment-score").clear().type(input.score);
    }

    if (input.weight) {
      cy.get("#form-create-assessment-weight").clear().type(input.weight);
    }

    cy.contains('[role="dialog"] button', "Add Assessment").click();
    cy.get('[role="dialog"]').should("not.exist");
  }

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser);
    visitSubjectsPage();
  });

  it("creates an assessment with grading fields", () => {
    const subjectName = uniqueValue("Assessments Subject");
    const assessmentTitle = uniqueValue("Midterm");

    createSubject({
      name: subjectName,
      description: "Subject used for assessment creation",
    });
    openSubjectDetail(subjectName);
    cy.contains("h2", "Assessments").should("be.visible");

    createAssessment({
      title: assessmentTitle,
      description: "First graded assessment",
      dueDate: "2026-12-10",
      score: "84",
      weight: "40",
    });

    cy.contains("p", assessmentTitle)
      .closest("div.rounded-xl")
      .within(() => {
        cy.contains("Pending").should("be.visible");
        cy.contains("Completed").should("not.exist");
        cy.contains("84.0").should("be.visible");
      });
  });

  it("validates required title before creating", () => {
    const subjectName = uniqueValue("Validation Subject");
    const title = uniqueValue("Validated Assessment");

    createSubject({
      name: subjectName,
      description: "Subject used for assessment validation",
    });
    openSubjectDetail(subjectName);
    cy.contains("h2", "Assessments").should("be.visible");

    cy.contains("button", "Add Assessment").click();
    cy.get('[role="dialog"]').should("be.visible");

    cy.contains('[role="dialog"] button', "Add Assessment").click();
    cy.contains("Title is required.").should("be.visible");

    cy.get("#form-create-assessment-title").type(title);
    cy.contains('[role="dialog"] button', "Add Assessment").click();

    cy.get('[role="dialog"]').should("not.exist");
    cy.contains("p", title).should("be.visible");
  });

  it("edits an assessment", () => {
    const subjectName = uniqueValue("Edit Assessment Subject");
    const initialTitle = uniqueValue("Initial Assessment");
    const updatedTitle = uniqueValue("Updated Assessment");

    createSubject({
      name: subjectName,
      description: "Subject used for assessment editing",
    });
    openSubjectDetail(subjectName);

    createAssessment({
      title: initialTitle,
      dueDate: "2026-10-10",
    });

    cy.contains("p", initialTitle)
      .closest("div.rounded-xl")
      .within(() => {
        cy.get("button").first().click();
      });

    cy.get('[role="dialog"]').should("be.visible");
    cy.get("#form-edit-assessment-title").clear().type(updatedTitle);
    cy.get("#form-edit-assessment-status").click();
    cy.contains('[role="option"]', "Completed").click();
    cy.contains('[role="dialog"] button', "Save Changes").click();

    cy.get('[role="dialog"]').should("not.exist");
    cy.contains("p", updatedTitle)
      .closest("div.rounded-xl")
      .within(() => {
        cy.contains("Completed").should("be.visible");
      });
  });

  it("deletes an assessment", () => {
    const subjectName = uniqueValue("Delete Assessment Subject");
    const title = uniqueValue("Disposable Assessment");

    createSubject({
      name: subjectName,
      description: "Subject used for assessment deletion",
    });
    openSubjectDetail(subjectName);

    createAssessment({ title });

    cy.contains("p", title)
      .closest("div.rounded-xl")
      .within(() => {
        cy.get("button").eq(1).click();
      });

    cy.get('[role="dialog"]').within(() => {
      cy.contains("Delete Assessment").should("be.visible");
      cy.contains("button", "Delete").click();
    });

    cy.contains("p", title).should("not.exist");
    cy.contains("No assessments yet").should("be.visible");
  });
});
