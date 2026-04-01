import { expect, type Page, test } from "@playwright/test";
import {
  clearUserAttendanceMissesBySubject,
  clearUserSubjectsByNames,
  createAttendanceMiss,
  createSubject,
  ensureApprovedE2EUser,
  updateSubjectAttendanceSettings,
} from "./support/db";

function getUniqueSubjectName(testTitle: string) {
  return `E2E Attendance ${testTitle} ${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

async function openSubjectDetailByName(page: Page, subjectName: string) {
  await page.goto("/subjects");
  await expect(
    page.getByRole("heading", { name: "Subjects", exact: true }),
  ).toBeVisible();

  const subjectCard = page
    .getByTestId("subject-card")
    .filter({ hasText: subjectName })
    .first();

  await expect(subjectCard).toBeVisible();
  await subjectCard.getByTestId("subject-card-link").click();
  await expect(page.getByRole("heading", { name: subjectName })).toBeVisible();
}

test("can configure attendance settings", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("settings");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Attendance settings test",
    );

    await clearUserAttendanceMissesBySubject(user.userId, createdSubject.id);
    await openSubjectDetailByName(page, subjectName);

    await expect(page.getByText("No attendance settings yet")).toBeVisible();

    await page.getByRole("button", { name: "Settings" }).click();

    const settingsDialog = page.getByRole("dialog", {
      name: "Attendance Settings",
    });

    await settingsDialog.locator("#form-attendance-total-classes").fill("20");
    await settingsDialog.locator("#form-attendance-max-misses").fill("5");
    await settingsDialog.getByRole("button", { name: "Save Settings" }).click();

    await expect(settingsDialog).toHaveCount(0);
    await expect(page.getByText("On Track")).toBeVisible();
    await expect(page.getByText("5 misses remaining")).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can record a miss and rejects duplicate dates", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("record-duplicate");
  const missDate = "2026-03-10";

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Attendance record miss test",
    );

    await updateSubjectAttendanceSettings(
      user.userId,
      createdSubject.id,
      20,
      4,
    );
    await clearUserAttendanceMissesBySubject(user.userId, createdSubject.id);

    await openSubjectDetailByName(page, subjectName);

    await page.locator("#btn-record-miss").click();
    const recordDialog = page.getByRole("dialog", { name: "Record a Miss" });
    await recordDialog.locator("#form-record-miss-date").fill(missDate);
    await recordDialog.getByRole("button", { name: "Record Miss" }).click();

    await expect(recordDialog).toHaveCount(0);

    await page.getByRole("button", { name: "Recorded Misses" }).click();
    await expect(page.getByText(/Mar 10, 2026/)).toBeVisible();

    await page.locator("#btn-record-miss").click();
    const duplicateDialog = page.getByRole("dialog", { name: "Record a Miss" });
    await duplicateDialog.locator("#form-record-miss-date").fill(missDate);
    await duplicateDialog.getByRole("button", { name: "Record Miss" }).click();

    await expect(
      duplicateDialog.getByText("A miss is already recorded for this date."),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("can delete a recorded miss", async ({ page }) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("delete");
  const missDate = "2026-03-11";

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Attendance delete miss test",
    );

    await updateSubjectAttendanceSettings(
      user.userId,
      createdSubject.id,
      16,
      4,
    );
    await clearUserAttendanceMissesBySubject(user.userId, createdSubject.id);
    await createAttendanceMiss(user.userId, createdSubject.id, missDate);

    await openSubjectDetailByName(page, subjectName);

    await page.getByRole("button", { name: "Recorded Misses" }).click();
    const missDateText = page.getByText(/Mar 11, 2026/);
    await expect(missDateText).toBeVisible();
    await page.getByTestId(`attendance-miss-delete-${missDate}`).click();

    const deleteDialog = page.getByRole("dialog", { name: "Remove Miss" });
    await deleteDialog.getByRole("button", { name: "Remove" }).click();

    await expect(deleteDialog).toHaveCount(0);
    await expect(page.getByText(/Mar 11, 2026/)).toHaveCount(0);
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});

test("shows warning and limit reached attendance statuses", async ({
  page,
}) => {
  const user = await ensureApprovedE2EUser();
  const subjectName = getUniqueSubjectName("statuses");

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Attendance status test",
    );

    await updateSubjectAttendanceSettings(
      user.userId,
      createdSubject.id,
      20,
      4,
    );
    await clearUserAttendanceMissesBySubject(user.userId, createdSubject.id);
    await createAttendanceMiss(user.userId, createdSubject.id, "2026-03-01");
    await createAttendanceMiss(user.userId, createdSubject.id, "2026-03-02");
    await createAttendanceMiss(user.userId, createdSubject.id, "2026-03-03");

    await openSubjectDetailByName(page, subjectName);

    await expect(page.getByText("Warning")).toBeVisible();
    await expect(page.getByText("1 miss remaining")).toBeVisible();

    await page.locator("#btn-record-miss").click();
    const recordDialog = page.getByRole("dialog", { name: "Record a Miss" });
    await recordDialog.locator("#form-record-miss-date").fill("2026-03-04");
    await recordDialog.getByRole("button", { name: "Record Miss" }).click();

    await expect(recordDialog).toHaveCount(0);
    await expect(page.getByText("Limit Reached")).toBeVisible();
    await expect(page.getByText("No misses left")).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});
