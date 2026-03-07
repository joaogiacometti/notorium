import { expect, test } from "@playwright/test";
import { closeE2EDb } from "../../helpers/db";
import {
  createAssessment,
  createSubject,
  deleteAssessmentByTitle,
  editAssessmentByTitle,
  openSubject,
} from "../../helpers/subjects";

function uniqueValue(base: string) {
  return `${base} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function assessmentCard(
  page: Parameters<typeof createSubject>[0],
  title: string,
) {
  return page
    .locator("div.rounded-xl", {
      has: page.getByText(title, { exact: true }),
    })
    .first();
}

test.describe("subjects assessments", () => {
  test.afterAll(async () => {
    await closeE2EDb();
  });

  test("creates an assessment for a subject", async ({ page }) => {
    const subjectName = uniqueValue("E2E Subject Assessments Create");
    const createdTitle = uniqueValue("E2E Assessment Created");
    const createdDescription = uniqueValue("Assessment created from E2E");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: subjectName,
      description: uniqueValue("Assessments create subject"),
    });

    await openSubject(page, subjectName);
    await createAssessment(page, {
      title: createdTitle,
      description: createdDescription,
      type: "Exam",
      status: "Pending",
      dueDate: "2026-06-15",
      score: "84",
      weight: "40",
    });

    const createdAssessmentCard = assessmentCard(page, createdTitle);
    await expect(createdAssessmentCard.getByText(createdTitle)).toBeVisible();
    await expect(
      createdAssessmentCard.getByText(createdDescription),
    ).toBeVisible();
    await expect(
      createdAssessmentCard.getByText("84.0", { exact: true }),
    ).toBeVisible();
  });

  test("edits an existing assessment", async ({ page }) => {
    const subjectName = uniqueValue("E2E Subject Assessments Edit");
    const createdTitle = uniqueValue("E2E Assessment Created");
    const updatedTitle = uniqueValue("E2E Assessment Updated");
    const updatedDescription = uniqueValue("Assessment updated from E2E");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: subjectName,
      description: uniqueValue("Assessments edit subject"),
    });

    await openSubject(page, subjectName);
    await createAssessment(page, {
      title: createdTitle,
      description: uniqueValue("Assessment created from E2E"),
      type: "Exam",
      status: "Pending",
      dueDate: "2026-06-15",
      score: "84",
      weight: "40",
    });

    await editAssessmentByTitle(page, createdTitle, {
      title: updatedTitle,
      description: updatedDescription,
      type: "Project",
      status: "Completed",
      dueDate: "2026-07-20",
      score: "92",
      weight: "50",
    });

    const updatedAssessmentCard = assessmentCard(page, updatedTitle);

    await expect(updatedAssessmentCard.getByText(updatedTitle)).toBeVisible();
    await expect(
      updatedAssessmentCard.getByText(updatedDescription),
    ).toBeVisible();
    await expect(updatedAssessmentCard.getByText("Completed")).toBeVisible();
    await expect(updatedAssessmentCard.getByText("Project")).toBeVisible();
    await expect(
      updatedAssessmentCard.getByText("92.0", { exact: true }),
    ).toBeVisible();
  });

  test("deletes an assessment", async ({ page }) => {
    const subjectName = uniqueValue("E2E Subject Assessments Delete");
    const createdTitle = uniqueValue("E2E Assessment Created");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: subjectName,
      description: uniqueValue("Assessments delete subject"),
    });

    await openSubject(page, subjectName);
    await createAssessment(page, {
      title: createdTitle,
      description: uniqueValue("Assessment created from E2E"),
      type: "Exam",
      status: "Pending",
      dueDate: "2026-06-15",
      score: "84",
      weight: "40",
    });

    await deleteAssessmentByTitle(page, createdTitle);
    await expect(page.getByText(createdTitle)).toHaveCount(0);
    await expect(page.getByText("No assessments yet")).toBeVisible();
  });
});
