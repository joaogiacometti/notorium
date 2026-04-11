import type { Page } from "@playwright/test";
import { expect } from "./authenticated-test";

export async function openSubjectDetailByName(page: Page, subjectName: string) {
  await page.goto("/subjects");
  await expect(
    page.getByRole("heading", { name: "Subjects", exact: true }),
  ).toBeVisible();

  const subjectCard = page.getByTestId("subject-card").filter({
    has: page.getByRole("link", { name: subjectName, exact: true }),
  });

  await expect(subjectCard).toHaveCount(1);

  const subjectLink = subjectCard.getByTestId("subject-card-link");
  await expect(subjectLink).toBeVisible();

  await subjectLink.click();
  await expect(
    page.getByRole("heading", { name: subjectName, exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId("subject-detail-edit")).toBeVisible();
}
