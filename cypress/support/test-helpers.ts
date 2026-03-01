export function uniqueValue(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function signUp(user: {
  name: string;
  email: string;
  password: string;
}) {
  cy.visit("/signup");
  cy.get("#form-signup-name").type(user.name);
  cy.get("#form-signup-email").type(user.email);
  cy.get("#form-signup-password").type(user.password);
  cy.get("#form-signup-confirm-password").type(user.password);
  cy.contains("button", "Create Account").click();
  cy.url({ timeout: 10000 }).should("include", "/subjects");
}

export function login(user: { email: string; password: string }) {
  cy.visit("/login");
  cy.get("#form-login-email").type(user.email);
  cy.get("#form-login-password").type(user.password);
  cy.contains("button", "Login").click();
  cy.url({ timeout: 10000 }).should("include", "/subjects");
}

export function setUserPlan(email: string, plan: "free" | "pro" | "unlimited") {
  cy.task("setUserPlan", { email, plan });
}

export function authenticateWithSession(
  user: {
    name: string;
    email: string;
    password: string;
  },
  plan: "free" | "pro" | "unlimited" = "free",
) {
  cy.session(`${user.email}:${plan}`, () => {
    signUp(user);

    if (plan !== "free") {
      setUserPlan(user.email, plan);
      cy.clearCookies();
      cy.clearLocalStorage();
      login(user);
    }
  });
}

export function visitSubjectsPage() {
  cy.visit("/subjects");
  cy.url({ timeout: 10000 }).should("include", "/subjects");
}

export function createSubject(input: { name: string; description: string }) {
  cy.get("#btn-create-subject").click();
  cy.get('[role="dialog"]').should("be.visible");
  cy.get("#form-create-subject-name").clear().type(input.name);
  cy.get("#form-create-subject-description").clear().type(input.description);
  cy.contains('[role="dialog"] button', "Create Subject").click();
  cy.get('[role="dialog"]').should("not.exist");
}

export function openSubjectDetail(subjectName: string) {
  cy.contains('[data-slot="card-title"]', subjectName).click();
  cy.url({ timeout: 10000 }).should("match", /\/subjects\/[^/]+$/);
}

export function createNote(input: { title: string }) {
  cy.get("#btn-create-note").click();
  cy.get('[role="dialog"]').should("be.visible");
  cy.get("#form-create-note-title").clear().type(input.title);
  cy.contains('[role="dialog"] button', "Create Note").click();
  cy.get('[role="dialog"]').should("not.exist");
}

export function openNoteDetail(noteTitle: string) {
  cy.contains("a", noteTitle).click();
  cy.url({ timeout: 10000 }).should("match", /\/notes\/[^/]+$/);
}
