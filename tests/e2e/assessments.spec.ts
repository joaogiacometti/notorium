import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  clearUserSubjectsByNames,
  createAssessment,
  createMaxAssessmentsForSubject,
  createSubject,
  ensureApprovedE2EUser,
} from "./support/db";

function getUniqueSubjectName(testTitle: string) {
  return `E2E Assessments ${testTitle} ${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getUniqueAssessmentTitle(testTitle: string) {
  return `E2E Assessment ${testTitle} ${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

async function openPlanningAssessments(page: Page, subjectId?: string) {
  const searchParams = new URLSearchParams({ view: "assessments" });

  if (subjectId) {
    searchParams.set("subject", subjectId);
  }

  await page.goto(`/en/planning?${searchParams.toString()}`);
  await expect(
    page.getByRole("heading", { name: "Planning", exact: true }),
  ).toBeVisible();
}

async function openCreateAssessmentDialog(page: Page) {
  await page.getByRole("button", { name: "Add Assessment" }).first().click();
  const createDialog = page.getByRole("dialog", { name: "Add Assessment" });
  await expect(createDialog).toBeVisible();

  return createDialog;
}

async function selectDialogOption(
  page: Page,
  dialog: Locator,
  triggerSelector: string,
  optionLabel: string,
) {
  await dialog.locator(triggerSelector).click();
  await page.getByRole("option", { name: optionLabel, exact: true }).click();
}

test("can create and open an assessment from planning", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("create-open");
  const assessmentTitle = getUniqueAssessmentTitle("create-open");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Assessments create test",
    );

    await openPlanningAssessments(page, createdSubject.id);

    const createDialog = await openCreateAssessmentDialog(page);
    await createDialog
      .locator("#form-create-assessment-title")
      .fill(assessmentTitle);
    await createDialog
      .locator("#form-create-assessment-description")
      .fill("Assessment created from planning page");
    await createDialog
      .locator("#form-create-assessment-due-date")
      .fill("2026-06-25");
    await createDialog.locator("#form-create-assessment-score").fill("84");
    await createDialog.locator("#form-create-assessment-weight").fill("40");
    await createDialog
      .getByRole("button", { name: "Add Assessment", exact: true })
      .click();

    await expect(createDialog).toHaveCount(0);

    const assessmentRow = page.getByRole("link", {
      name: `Open details for ${assessmentTitle}`,
      exact: true,
    });

    await expect(assessmentRow).toBeVisible();
    await assessmentRow.click();

    await expect(page).toHaveURL(/\/en\/assessments\/.+/);
    await expect(
      page.getByRole("heading", { name: assessmentTitle, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Assessment created from planning page"),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can edit an assessment from detail page", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("edit");
  const initialTitle = getUniqueAssessmentTitle("edit-initial");
  const updatedTitle = getUniqueAssessmentTitle("edit-updated");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Assessment edit test",
    );

    const createdAssessment = await createAssessment(
      user.userId,
      createdSubject.id,
      initialTitle,
      {
        description: "Initial assessment description",
        status: "pending",
      },
    );

    await page.goto(
      `/en/assessments/${createdAssessment.id}?from=planning-assessments&subjectId=${createdSubject.id}`,
    );

    await expect(
      page.getByRole("heading", { name: initialTitle, exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Edit", exact: true }).click();

    const editDialog = page.getByRole("dialog", { name: "Edit Assessment" });
    await editDialog.locator("#form-edit-assessment-title").fill(updatedTitle);
    await editDialog
      .locator("#form-edit-assessment-description")
      .fill("Updated assessment description");
    await selectDialogOption(
      page,
      editDialog,
      "#form-edit-assessment-status",
      "Completed",
    );
    await editDialog.locator("#form-edit-assessment-score").fill("95");
    await editDialog.locator("#form-edit-assessment-weight").fill("50");
    await editDialog
      .getByRole("button", { name: "Save Changes", exact: true })
      .click();

    await expect(editDialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: updatedTitle, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Updated assessment description"),
    ).toBeVisible();
    await expect(
      page.getByText("Completed", { exact: true }).first(),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can delete an assessment from detail page", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("delete");
  const assessmentTitle = getUniqueAssessmentTitle("delete");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Assessment delete test",
    );

    const createdAssessment = await createAssessment(
      user.userId,
      createdSubject.id,
      assessmentTitle,
      {
        description: "Assessment to delete",
        status: "pending",
      },
    );

    await page.goto(
      `/en/assessments/${createdAssessment.id}?from=planning-assessments&subjectId=${createdSubject.id}`,
    );

    await expect(
      page.getByRole("heading", { name: assessmentTitle, exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Delete", exact: true }).click();

    const deleteDialog = page.getByRole("dialog", {
      name: "Delete Assessment",
    });
    await deleteDialog
      .getByRole("button", { name: "Delete", exact: true })
      .click();

    await expect(deleteDialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Planning", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: `Open details for ${assessmentTitle}`,
        exact: true,
      }),
    ).toHaveCount(0);
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("shows overdue status for pending past due assessments", async ({
  page,
}) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("overdue");
  const assessmentTitle = getUniqueAssessmentTitle("overdue");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Assessments overdue state test",
    );

    await createAssessment(user.userId, createdSubject.id, assessmentTitle, {
      dueDate: "2024-01-10",
      status: "pending",
    });

    await openPlanningAssessments(page, createdSubject.id);

    const assessmentRowLink = page.getByRole("link", {
      name: `Open details for ${assessmentTitle}`,
      exact: true,
    });
    await expect(assessmentRowLink).toBeVisible();
    await expect(assessmentRowLink).toContainText("Overdue");
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("shows assessment limit message in single-subject mode", async ({
  page,
}) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("limit");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Assessments limit test",
    );

    await createMaxAssessmentsForSubject(user.userId, createdSubject.id);

    await openPlanningAssessments(page, createdSubject.id);

    await expect(
      page.getByText(/reached the limit of .* assessments per subject/i),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("shows weighted final grade in planning subject mode", async ({
  page,
}) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("final-grade");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Assessments final grade test",
    );

    await createAssessment(
      user.userId,
      createdSubject.id,
      getUniqueAssessmentTitle("final-grade-1"),
      {
        status: "completed",
        score: "80",
        weight: "40",
      },
    );

    await createAssessment(
      user.userId,
      createdSubject.id,
      getUniqueAssessmentTitle("final-grade-2"),
      {
        status: "completed",
        score: "100",
        weight: "60",
      },
    );

    await openPlanningAssessments(page, createdSubject.id);

    await expect(page.getByText("Final grade", { exact: false })).toBeVisible();
    await expect(page.getByText("92.0", { exact: true })).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});
