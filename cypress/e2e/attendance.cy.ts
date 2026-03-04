import {
  authenticateWithSession,
  createSubject,
  openSubjectDetail,
  uniqueValue,
  visitSubjectsPage,
} from "../support/test-helpers";

function configureAttendance(totalClasses: string, maxMisses: string) {
  cy.contains("button", "Settings").click();
  cy.get('[role="dialog"]').should("be.visible");

  cy.get("#form-attendance-total-classes").clear().type(totalClasses);
  cy.get("#form-attendance-max-misses").clear().type(maxMisses);
  cy.contains('[role="dialog"] button', "Save Settings").click();

  cy.get('[role="dialog"]').should("not.exist");
}

describe("Attendance", () => {
  const testUser = {
    name: "Cypress Attendance User",
    email: `cypress-attendance-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser);
    visitSubjectsPage();
  });

  it("updates attendance settings", () => {
    const subjectName = uniqueValue("Attendance Subject");

    createSubject({
      name: subjectName,
      description: "Subject used for attendance settings",
    });
    openSubjectDetail(subjectName);
    cy.contains("h2", "Attendance").should("be.visible");

    configureAttendance("12", "3");

    cy.contains("3 misses remaining").should("be.visible");
    cy.contains("0 / 3").should("be.visible");
    cy.contains("100%").should("be.visible");
  });

  it("records a miss and rejects duplicate dates", () => {
    const subjectName = uniqueValue("Record Miss Subject");
    const missDate = "2026-02-10";

    createSubject({
      name: subjectName,
      description: "Subject used for recording misses",
    });
    openSubjectDetail(subjectName);

    configureAttendance("12", "3");

    cy.get("#btn-record-miss").click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.get("#form-record-miss-date").clear().type(missDate);
    cy.contains('[role="dialog"] button', "Record Miss").click();
    cy.get('[role="dialog"]').should("not.exist");

    cy.contains("2 misses remaining").should("be.visible");
    cy.contains("Recorded Misses").should("be.visible");

    cy.get("#btn-record-miss").click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.get("#form-record-miss-date").clear().type(missDate);
    cy.contains('[role="dialog"] button', "Record Miss").click();

    cy.contains("A miss is already recorded for this date.").should(
      "be.visible",
    );
  });

  it("deletes a recorded miss", () => {
    const subjectName = uniqueValue("Delete Miss Subject");

    createSubject({
      name: subjectName,
      description: "Subject used for deleting misses",
    });
    openSubjectDetail(subjectName);

    configureAttendance("12", "3");

    cy.get("#btn-record-miss").click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.get("#form-record-miss-date").clear().type("2026-02-11");
    cy.contains('[role="dialog"] button', "Record Miss").click();
    cy.get('[role="dialog"]').should("not.exist");

    cy.contains("Recorded Misses").click();
    cy.contains("Recorded Misses")
      .closest('[data-slot="accordion-item"]')
      .find('[data-slot="accordion-content"]')
      .within(() => {
        cy.get("button").first().click();
      });

    cy.get('[role="dialog"]').within(() => {
      cy.contains("Remove Miss").should("be.visible");
      cy.contains("button", "Remove").click();
    });

    cy.contains("3 misses remaining").should("be.visible");
    cy.contains("Recorded Misses").should("not.exist");
  });
});
