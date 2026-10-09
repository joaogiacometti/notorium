import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import { clearUserSubjectsByNames, createSubject } from "./support/db";
import { openSubjectDetailByName } from "./support/subjects";

test("setting a study schedule creates weekly study tasks and removing it clears them", async ({
  page,
  e2eUser,
}) => {
  const subjectName = getPrefixedValue("study-schedule", "weekly-tasks");

  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    const createdSubject = await createSubject(e2eUser.userId, subjectName);
    await openSubjectDetailByName(page, subjectName, createdSubject.id);

    await page.getByRole("button", { name: "Set schedule" }).click();
    const dialog = page.getByRole("dialog", { name: "Study Schedule" });
    // 2026-02-04 is a Wednesday; three class weeks fit before 2026-02-18.
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Wednesday" }).click();
    await dialog.locator("#form-study-schedule-termStart").fill("2026-02-04");
    await dialog.locator("#form-study-schedule-termEnd").fill("2026-02-18");
    await dialog.getByRole("button", { name: "Save Schedule" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Classes on Wednesdays")).toBeVisible();
    await expect(page.getByText("Study week 1 content")).toBeVisible();
    await expect(page.getByText("Study week 3 content")).toBeVisible();

    // Thursdays only fit two class weeks, so week 3 is dropped on re-save.
    await page.getByRole("button", { name: "Manage study schedule" }).click();
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Thursday" }).click();
    await dialog.getByRole("button", { name: "Save Schedule" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Classes on Thursdays")).toBeVisible();
    await expect(page.getByText("Study week 2 content")).toBeVisible();
    await expect(page.getByText("Study week 3 content")).toHaveCount(0);

    await page.getByRole("button", { name: "Manage study schedule" }).click();
    await dialog.getByRole("button", { name: "Remove Schedule" }).click();
    await page.getByRole("button", { name: "Remove", exact: true }).click();

    await expect(page.getByText("Study week 1 content")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Set schedule" }),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});
