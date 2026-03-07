import type { Locator, Page } from "@playwright/test";

function firstSubjectActionsButton(page: Page): Locator {
  return page.getByLabel("Open subject actions").first();
}

export async function createSubject(
  page: Page,
  data: {
    name: string;
    description: string;
  },
) {
  await page.locator("#btn-create-subject").click();
  await page.locator("#form-create-subject-name").fill(data.name);
  await page.locator("#form-create-subject-description").fill(data.description);
  await page.getByRole("button", { name: "Create Subject" }).click();
}

export async function openSubject(page: Page, subjectName: string) {
  await page.getByRole("link", { name: subjectName }).first().click();
}

export async function editFirstSubject(
  page: Page,
  data: {
    name: string;
    description: string;
  },
) {
  await firstSubjectActionsButton(page).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.locator("#form-edit-subject-name").fill(data.name);
  await page.locator("#form-edit-subject-description").fill(data.description);
  await page.getByRole("button", { name: "Save Changes" }).click();
}

export async function archiveFirstSubject(page: Page) {
  await firstSubjectActionsButton(page).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await page.getByRole("button", { name: "Archive" }).click();
}

export async function deleteFirstSubject(page: Page) {
  await firstSubjectActionsButton(page).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
}

export async function updateAttendanceSettings(
  page: Page,
  data: {
    totalClasses: string;
    maxMisses: string;
  },
) {
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("#form-attendance-total-classes").fill(data.totalClasses);
  await page.locator("#form-attendance-max-misses").fill(data.maxMisses);
  await page.getByRole("button", { name: "Save Settings" }).click();
}

export async function recordMiss(page: Page, missDate: string) {
  await page.locator("#btn-record-miss").click();
  await page.locator("#form-record-miss-date").fill(missDate);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Record Miss" })
    .click();
}

export async function openRecordedMisses(page: Page) {
  await page.getByRole("button", { name: "Recorded Misses" }).click();
}

export async function deleteRecordedMiss(page: Page, missDate: string) {
  const missRow = page
    .locator("div.flex.items-center.justify-between.rounded-lg", {
      hasText: missDate,
    })
    .first();

  await missRow.locator("button:has(svg.lucide-trash2)").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove" })
    .click();
}

export async function createAssessment(
  page: Page,
  data: {
    title: string;
    description: string;
    type: string;
    status: string;
    dueDate: string;
    score: string;
    weight: string;
  },
) {
  await page.getByRole("button", { name: "Add Assessment" }).click();
  await page.locator("#form-create-assessment-title").fill(data.title);
  await page
    .locator("#form-create-assessment-description")
    .fill(data.description);
  await page.locator("#form-create-assessment-type").click();
  await page.getByRole("option", { name: data.type }).click();
  await page.locator("#form-create-assessment-status").click();
  await page.getByRole("option", { name: data.status }).click();
  await page.locator("#form-create-assessment-due-date").fill(data.dueDate);
  await page.locator("#form-create-assessment-score").fill(data.score);
  await page.locator("#form-create-assessment-weight").fill(data.weight);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add Assessment" })
    .click();
}

function assessmentCardByTitle(page: Page, title: string): Locator {
  return page.locator("div.rounded-xl", {
    has: page.getByText(title, { exact: true }),
  });
}

export async function editAssessmentByTitle(
  page: Page,
  currentTitle: string,
  data: {
    title: string;
    description: string;
    type: string;
    status: string;
    dueDate: string;
    score: string;
    weight: string;
  },
) {
  await assessmentCardByTitle(page, currentTitle)
    .first()
    .getByRole("button", { name: "Edit" })
    .click();
  await page.locator("#form-edit-assessment-title").fill(data.title);
  await page
    .locator("#form-edit-assessment-description")
    .fill(data.description);
  await page.locator("#form-edit-assessment-type").click();
  await page.getByRole("option", { name: data.type }).click();
  await page.locator("#form-edit-assessment-status").click();
  await page.getByRole("option", { name: data.status }).click();
  await page.locator("#form-edit-assessment-due-date").fill(data.dueDate);
  await page.locator("#form-edit-assessment-score").fill(data.score);
  await page.locator("#form-edit-assessment-weight").fill(data.weight);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save Changes" })
    .click();
}

export async function deleteAssessmentByTitle(page: Page, title: string) {
  await assessmentCardByTitle(page, title)
    .first()
    .getByRole("button", { name: "Delete" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
}

export async function openFlashcardsSection(page: Page) {
  await page.getByRole("button", { name: "Show flashcards" }).click();
}

export async function createFlashcard(
  page: Page,
  data: {
    front: string;
    back: string;
  },
) {
  await page.locator("#btn-create-flashcard").click();
  await page.locator("#form-create-flashcard-front").fill(data.front);
  await page.locator("#form-create-flashcard-back").fill(data.back);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create Flashcard" })
    .click();
}

function flashcardRowByFront(page: Page, frontText: string): Locator {
  return page.locator("tbody tr", {
    has: page.getByRole("link", { name: frontText, exact: true }),
  });
}

export async function editFlashcardByFront(
  page: Page,
  currentFront: string,
  data: {
    front: string;
    back: string;
  },
) {
  await flashcardRowByFront(page, currentFront)
    .first()
    .getByRole("button", { name: "Open flashcard actions" })
    .click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.locator("#form-edit-flashcard-front").fill(data.front);
  await page.locator("#form-edit-flashcard-back").fill(data.back);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save Changes" })
    .click();
}

export async function deleteFlashcardByFront(page: Page, frontText: string) {
  await flashcardRowByFront(page, frontText)
    .first()
    .getByRole("button", { name: "Open flashcard actions" })
    .click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete" })
    .click();
}
