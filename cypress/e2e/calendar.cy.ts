import {
  authenticateWithSession,
  createSubject,
  openSubjectDetail,
  uniqueValue,
  visitSubjectsPage,
} from "../support/test-helpers";

describe("Calendar", () => {
  const testUser = {
    name: "Cypress Calendar User",
    email: `cypress-calendar-${Date.now()}@test.com`,
    password: "TestPassword123!",
  };

  beforeEach(() => {
    cy.viewport(1280, 720);
    authenticateWithSession(testUser);
  });

  it("redirects unauthenticated users to /login", () => {
    cy.clearAllCookies();
    cy.clearAllSessionStorage();
    cy.visit("/calendar");

    cy.url({ timeout: 10000 }).should("include", "/login");
  });

  it("renders calendar heading and controls", () => {
    cy.visit("/calendar");

    cy.contains("h1", "Calendar").should("be.visible");
    cy.contains("Assessments and attendance misses on a timeline.").should(
      "be.visible",
    );
    cy.contains("button", "Today").should("be.visible");
  });

  it("displays weekday headers in month view", () => {
    cy.visit("/calendar");

    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      cy.contains(day).should("be.visible");
    }
  });

  it("navigates to previous and next month", () => {
    cy.visit("/calendar");

    cy.get("h2").invoke("text").as("initialTitle");

    cy.get("button").filter(":has(svg.lucide-chevron-left)").click();
    cy.get("h2")
      .invoke("text")
      .then(function (prevTitle) {
        expect(prevTitle).not.to.equal(this.initialTitle);
      });

    cy.get("button").filter(":has(svg.lucide-chevron-right)").click();
    cy.get("h2")
      .invoke("text")
      .then(function (currentTitle) {
        expect(currentTitle).to.equal(this.initialTitle);
      });
  });

  it("shows assessment event on the calendar after creating one", () => {
    visitSubjectsPage();

    const subjectName = uniqueValue("Cal Subject");
    createSubject({
      name: subjectName,
      description: "Subject for calendar test",
    });
    openSubjectDetail(subjectName);
    cy.contains("h2", "Assessments").should("be.visible");

    cy.contains("button", "Add Assessment").click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.get("#form-create-assessment-title").clear().type("Calendar Exam");
    cy.get("#form-create-assessment-due-date").clear().type("2026-03-15");
    cy.contains('[role="dialog"] button', "Add Assessment").click();
    cy.get('[role="dialog"]').should("not.exist");

    cy.visit("/calendar");

    cy.contains("Calendar Exam").should("be.visible");
  });

  it("shows attendance miss on the calendar after recording one", () => {
    visitSubjectsPage();

    const subjectName = uniqueValue("Cal Attendance Subject");
    createSubject({
      name: subjectName,
      description: "Subject for attendance calendar test",
    });
    openSubjectDetail(subjectName);
    cy.contains("h2", "Attendance").should("be.visible");

    cy.contains("button", "Settings").click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.get("#form-attendance-total-classes").clear().type("10");
    cy.get("#form-attendance-max-misses").clear().type("3");
    cy.contains('[role="dialog"] button', "Save Settings").click();
    cy.get('[role="dialog"]').should("not.exist");

    cy.contains("button", "Record Miss").click();
    cy.get('[role="dialog"]').should("be.visible");
    cy.get("#form-record-miss-date").clear().type("2026-03-10");
    cy.contains('[role="dialog"] button', "Record Miss").click();
    cy.get('[role="dialog"]').should("not.exist");

    cy.visit("/calendar");

    cy.contains("Missed class").should("be.visible");
  });

  it("shows calendar link in the navigation", () => {
    cy.visit("/subjects");

    cy.get('a[href="/calendar"]').should("exist");
  });
});
