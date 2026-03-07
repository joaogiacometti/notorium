import { expect, test } from "@playwright/test";
import { closeE2EDb } from "../../helpers/db";
import {
  createSubject,
  deleteRecordedMiss,
  openRecordedMisses,
  openSubject,
  recordMiss,
  updateAttendanceSettings,
} from "../../helpers/subjects";

function uniqueValue(base: string) {
  return `${base} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test.describe("subjects attendance", () => {
  test.afterAll(async () => {
    await closeE2EDb();
  });

  test("configures attendance settings for a subject", async ({ page }) => {
    const subjectName = uniqueValue("E2E Subject Attendance Settings");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: subjectName,
      description: uniqueValue("Attendance settings subject"),
    });

    await openSubject(page, subjectName);
    await updateAttendanceSettings(page, {
      totalClasses: "20",
      maxMisses: "4",
    });

    await expect(page.locator("#btn-record-miss")).toBeVisible();
    await expect(page.getByText("0 / 4")).toBeVisible();
  });

  test("records a miss for a subject", async ({ page }) => {
    const missDate = "2026-03-01";
    const formattedMissDate = "March 1, 2026";
    const subjectName = uniqueValue("E2E Subject Attendance Record");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: subjectName,
      description: uniqueValue("Attendance record subject"),
    });

    await openSubject(page, subjectName);
    await updateAttendanceSettings(page, {
      totalClasses: "20",
      maxMisses: "4",
    });

    await recordMiss(page, missDate);
    await expect(page.getByText("1 / 4")).toBeVisible();

    await openRecordedMisses(page);
    await expect(page.getByText(formattedMissDate)).toBeVisible();
  });

  test("rejects duplicate miss dates", async ({ page }) => {
    const missDate = "2026-03-01";
    const subjectName = uniqueValue("E2E Subject Attendance Duplicate");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: subjectName,
      description: uniqueValue("Attendance duplicate subject"),
    });

    await openSubject(page, subjectName);
    await updateAttendanceSettings(page, {
      totalClasses: "20",
      maxMisses: "4",
    });

    await recordMiss(page, missDate);
    await recordMiss(page, missDate);

    await expect(
      page.getByText("A miss is already recorded for this date."),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Record a Miss" }),
    ).toHaveCount(0);
  });

  test("deletes a recorded miss", async ({ page }) => {
    const missDate = "2026-03-01";
    const formattedMissDate = "March 1, 2026";
    const subjectName = uniqueValue("E2E Subject Attendance Delete");

    await page.goto("/en/subjects");

    await createSubject(page, {
      name: subjectName,
      description: uniqueValue("Attendance delete subject"),
    });

    await openSubject(page, subjectName);
    await updateAttendanceSettings(page, {
      totalClasses: "20",
      maxMisses: "4",
    });

    await recordMiss(page, missDate);
    await openRecordedMisses(page);
    await expect(page.getByText(formattedMissDate)).toBeVisible();

    await deleteRecordedMiss(page, formattedMissDate);
    await expect(page.getByText(formattedMissDate)).toHaveCount(0);
    await expect(page.getByText("0 / 4")).toBeVisible();
  });
});
