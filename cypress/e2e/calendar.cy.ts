import {
  authenticateWithSession,
  createSubject,
  openSubjectDetail,
  uniqueValue,
  visitSubjectsPage,
} from "../support/test-helpers";

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createAssessment(title: string, dueDate: string) {
  cy.contains("button", "Add Assessment").click();
  cy.get('[role="dialog"]').should("be.visible");
  cy.get("#form-create-assessment-title").clear().type(title);
  cy.get("#form-create-assessment-due-date").clear().type(dueDate);
  cy.contains('[role="dialog"] button', "Add Assessment").click();
  cy.get('[role="dialog"]').should("not.exist");
}

function configureAttendance(totalClasses: string, maxMisses: string) {
  cy.contains("button", "Settings").click();
  cy.get('[role="dialog"]').should("be.visible");
  cy.get("#form-attendance-total-classes").clear().type(totalClasses);
  cy.get("#form-attendance-max-misses").clear().type(maxMisses);
  cy.contains('[role="dialog"] button', "Save Settings").click();
  cy.get('[role="dialog"]').should("not.exist");
}

function recordMiss(missDate: string) {
  cy.get("#btn-record-miss").click();
  cy.get('[role="dialog"]').should("be.visible");
  cy.get("#form-record-miss-date").clear().type(missDate);
  cy.contains('[role="dialog"] button', "Record Miss").click();
  cy.get('[role="dialog"]').should("not.exist");
}

function seedCalendarSubject(
  subjectName: string,
  assessmentTitle: string,
  eventDate: string,
) {
  createSubject({
    name: subjectName,
    description: "Subject used for calendar coverage",
  });
  openSubjectDetail(subjectName);
  createAssessment(assessmentTitle, eventDate);
  configureAttendance("12", "3");
  recordMiss(eventDate);
}

describe("Calendar", () => {
  const testUser = {
    name: "Cypress Calendar User",
    email: `cypress-calendar-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser);
    visitSubjectsPage();
  });

  it("shows assessment and attendance miss events on the current date", () => {
    const subjectName = uniqueValue("Calendar Subject");
    const assessmentTitle = uniqueValue("Calendar Assessment");
    const eventDate = formatDateInput(new Date());

    seedCalendarSubject(subjectName, assessmentTitle, eventDate);

    cy.visit("/calendar");

    cy.contains("h1", "Calendar").should("be.visible");
    cy.contains("a", assessmentTitle, { timeout: 10000 }).should("be.visible");
    cy.contains("a", "Missed class", { timeout: 10000 }).should("be.visible");
    cy.contains("a", subjectName, { timeout: 10000 }).should("be.visible");
  });

  it("navigates to subject detail from a calendar event", () => {
    const subjectName = uniqueValue("Calendar Link Subject");
    const assessmentTitle = uniqueValue("Calendar Linked Assessment");
    const eventDate = formatDateInput(new Date());

    seedCalendarSubject(subjectName, assessmentTitle, eventDate);

    cy.visit("/calendar");
    cy.contains("a", assessmentTitle, { timeout: 10000 }).click();

    cy.url({ timeout: 10000 }).should("match", /\/subjects\/[^/]+$/);
    cy.contains("h1", subjectName).should("be.visible");
  });
});
