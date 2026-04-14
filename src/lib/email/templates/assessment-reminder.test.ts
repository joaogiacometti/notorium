import { describe, expect, it } from "vitest";
import { renderAssessmentReminderEmail } from "@/lib/email/templates/assessment-reminder";

const baseAssessment = {
  title: "Midterm Exam",
  subjectName: "Mathematics",
  dueDate: "2026-04-20",
  type: "exam" as const,
};

describe("renderAssessmentReminderEmail", () => {
  it("produces a subject line for a single assessment", () => {
    const { subject } = renderAssessmentReminderEmail({
      userName: "Alice",
      assessments: [baseAssessment],
      appUrl: "https://app.example.com",
    });

    expect(subject).toContain("Midterm Exam");
    expect(subject).toMatch(/reminder/i);
  });

  it("produces a count-based subject line for multiple assessments", () => {
    const { subject } = renderAssessmentReminderEmail({
      userName: "Bob",
      assessments: [
        baseAssessment,
        {
          title: "Final Project",
          subjectName: "Physics",
          dueDate: "2026-04-25",
          type: "project",
        },
      ],
      appUrl: "https://app.example.com",
    });

    expect(subject).toContain("2");
    expect(subject).toMatch(/reminder/i);
  });

  it("includes the user name in the HTML", () => {
    const { html } = renderAssessmentReminderEmail({
      userName: "Carol",
      assessments: [baseAssessment],
      appUrl: "https://app.example.com",
    });

    expect(html).toContain("Carol");
  });

  it("includes each assessment title in the HTML", () => {
    const { html } = renderAssessmentReminderEmail({
      userName: "Dave",
      assessments: [
        baseAssessment,
        {
          title: "Group Presentation",
          subjectName: "History",
          dueDate: "2026-04-22",
          type: "presentation",
        },
      ],
      appUrl: "https://app.example.com",
    });

    expect(html).toContain("Midterm Exam");
    expect(html).toContain("Group Presentation");
  });

  it("includes the planning URL as a link in the HTML", () => {
    const { html } = renderAssessmentReminderEmail({
      userName: "Eve",
      assessments: [baseAssessment],
      appUrl: "https://app.example.com",
    });

    expect(html).toContain("https://app.example.com/planning");
  });

  it("includes the account URL in the footer", () => {
    const { html } = renderAssessmentReminderEmail({
      userName: "Eve",
      assessments: [baseAssessment],
      appUrl: "https://app.example.com",
    });

    expect(html).toContain("https://app.example.com/account");
  });

  it("includes the subject name in the HTML", () => {
    const { html } = renderAssessmentReminderEmail({
      userName: "Frank",
      assessments: [baseAssessment],
      appUrl: "https://app.example.com",
    });

    expect(html).toContain("Mathematics");
  });

  it("renders type labels correctly", () => {
    const types = [
      { type: "exam" as const, label: "Exam" },
      { type: "assignment" as const, label: "Assignment" },
      { type: "project" as const, label: "Project" },
      { type: "presentation" as const, label: "Presentation" },
      { type: "homework" as const, label: "Homework" },
      { type: "other" as const, label: "Other" },
    ];

    for (const { type, label } of types) {
      const { html } = renderAssessmentReminderEmail({
        userName: "Test",
        assessments: [{ ...baseAssessment, type }],
        appUrl: "https://app.example.com",
      });

      expect(html, `should show label "${label}" for type "${type}"`).toContain(
        label,
      );
    }
  });

  it("produces valid HTML structure with doctype and body", () => {
    const { html } = renderAssessmentReminderEmail({
      userName: "Grace",
      assessments: [baseAssessment],
      appUrl: "https://app.example.com",
    });

    expect(html).toMatch(/<!DOCTYPE html>/i);
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
  });

  it("escapes HTML in user-controlled strings", () => {
    const { html } = renderAssessmentReminderEmail({
      userName: '<script>alert("xss")</script>',
      assessments: [
        {
          title: '<img src=x onerror=alert("xss")>',
          subjectName: "Math & Science <b>Bold</b>",
          dueDate: "2026-04-20",
          type: "exam",
        },
      ],
      appUrl: "https://app.example.com",
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>Bold</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Math &amp; Science");
  });
});
