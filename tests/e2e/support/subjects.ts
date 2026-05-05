import type { Page } from "@playwright/test";
import { expect } from "./authenticated-test";

export async function openSubjectDetailByName(page: Page, subjectName: string) {
  await page.goto("/subjects");
  await expect(
    page.getByRole("heading", { name: "Subjects", exact: true }),
  ).toBeVisible();

  const subjectRow = page.getByRole("row").filter({
    has: page.getByRole("link", { name: `Open ${subjectName}`, exact: true }),
  });

  await expect(subjectRow).toHaveCount(1);

  const subjectLink = subjectRow.getByRole("link", {
    name: `Open ${subjectName}`,
    exact: true,
  });
  await expect(subjectLink).toBeVisible();

  const subjectHref = await subjectLink.getAttribute("href");
  expect(subjectHref).toBeTruthy();

  if (!subjectHref) {
    throw new Error(`Missing href for subject: ${subjectName}`);
  }

  await page.goto(subjectHref);
  await expect(
    page.getByRole("heading", { name: subjectName, exact: true }),
  ).toBeVisible();

  await expect(page.getByTestId("subject-detail-edit")).toBeVisible();
}
