import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserAttendanceMissesBySubject,
  clearUserSubjectsByNames,
  createAttendanceMiss,
  createSubject,
  updateSubjectAttendanceSettings,
} from "./support/db";
import { openSubjectDetailByName } from "./support/subjects";

function getUniqueSubjectName(testTitle: string) {
  return getPrefixedValue("attendance-subject", testTitle);
}

test("can configure attendance settings", async ({ page, e2eUser }) => {
  const user = e2eUser;
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

test("can record a miss and rejects duplicate dates", async ({
  page,
  e2eUser,
}) => {
  const user = e2eUser;
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

    await expect(page.getByText("3 misses remaining")).toBeVisible();
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

test("can delete a recorded miss", async ({ page, e2eUser }) => {
  const user = e2eUser;
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

test("can remove attendance configuration", async ({ page, e2eUser }) => {
  const user = e2eUser;
  const subjectName = getUniqueSubjectName("remove-config");
  const missDate = "2026-03-12";

  await clearUserSubjectsByNames(user.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(
      user.userId,
      subjectName,
      "Attendance remove config test",
    );

    await updateSubjectAttendanceSettings(
      user.userId,
      createdSubject.id,
      20,
      4,
    );
    await clearUserAttendanceMissesBySubject(user.userId, createdSubject.id);
    await createAttendanceMiss(user.userId, createdSubject.id, missDate);

    await openSubjectDetailByName(page, subjectName);
    await expect(page.getByText("3 misses remaining")).toBeVisible();

    await page.getByRole("button", { name: "Settings" }).click();
    const settingsDialog = page.getByRole("dialog", {
      name: "Attendance Settings",
    });
    await expect(settingsDialog).toBeVisible();

    await settingsDialog
      .getByRole("button", { name: "Remove Configuration" })
      .click();

    const confirmDialog = page.getByRole("dialog", {
      name: "Remove Attendance Configuration",
    });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Remove" }).click();

    await expect(confirmDialog).toHaveCount(0);
    await expect(page.getByText("No attendance settings yet")).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(user.userId, [subjectName]);
  }
});
