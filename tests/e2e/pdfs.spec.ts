import type { Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import { clearUserSubjectsByNames, createSubject } from "./support/db";
import { MediaStorageUploadFixture } from "./support/media-storage-fixture";
import { buildBlankPdf } from "./support/pdf-file";
import { getPdfByTitle } from "./support/pdfs";
import {
  clickSubjectDocumentsMenuItem,
  openSubjectInSidebar,
} from "./support/subjects";

const PDF_DETAIL_URL = /\/subjects\/.+\/documents\/pdfs\/.+$/;
const UPLOADED_PDF = buildBlankPdf(3);

function getUniqueSubjectName(testTitle: string) {
  return getPrefixedValue("pdf-subject", testTitle);
}

function getUniquePdfTitle(testTitle: string) {
  return getPrefixedValue("pdf", testTitle);
}

async function uploadPdfFromSidebar(
  page: Page,
  subjectName: string,
  title: string,
) {
  await clickSubjectDocumentsMenuItem(page, subjectName, "Add PDF");
  const dialog = page.getByRole("dialog", { name: "Add PDF" });
  await dialog.locator("#form-create-pdf-file").setInputFiles({
    name: "book.pdf",
    mimeType: "application/pdf",
    buffer: UPLOADED_PDF,
  });
  await dialog.locator("#form-create-pdf-title").fill(title);
  await dialog.getByRole("button", { name: "Upload PDF" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(PDF_DETAIL_URL);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

async function openPdfActions(page: Page) {
  await page
    .getByRole("main")
    .getByRole("button", { name: "Open PDF actions", exact: true })
    .click();
}

test.beforeEach(async ({ page }) => {
  await new MediaStorageUploadFixture(UPLOADED_PDF).install(page);
});

test("uploads a PDF, reads it, and reopens on the last page", async ({
  page,
  e2eUser,
}) => {
  const subjectName = getUniqueSubjectName("upload-read");
  const pdfTitle = getUniquePdfTitle("upload-read");
  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    await createSubject(e2eUser.userId, subjectName);
    await openSubjectInSidebar(page, subjectName);
    await uploadPdfFromSidebar(page, subjectName, pdfTitle);

    await expect(page.getByText("/ 3")).toBeVisible();
    const pageNumber = page.getByRole("textbox", { name: "Page number" });
    await pageNumber.fill("3");
    await pageNumber.press("Enter");
    await expect
      .poll(
        async () => (await getPdfByTitle(e2eUser.userId, pdfTitle))?.lastPage,
      )
      .toBe(3);

    await page.reload();
    await expect(pageNumber).toHaveValue("3");
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("finds an uploaded PDF from global search", async ({ page, e2eUser }) => {
  const subjectName = getUniqueSubjectName("search");
  const pdfTitle = getUniquePdfTitle("search");
  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    await createSubject(e2eUser.userId, subjectName);
    await openSubjectInSidebar(page, subjectName);
    await uploadPdfFromSidebar(page, subjectName, pdfTitle);
    await page.goto("/");

    await page.keyboard.press("ControlOrMeta+k");
    const searchDialog = page.getByRole("dialog", {
      name: "Search and Commands",
    });
    await searchDialog.getByRole("combobox").fill(pdfTitle);
    await searchDialog.getByRole("option", { name: pdfTitle }).click();

    await expect(page).toHaveURL(PDF_DETAIL_URL);
    await expect(page.getByRole("heading", { name: pdfTitle })).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("renames and deletes a PDF from its header menu", async ({
  page,
  e2eUser,
}) => {
  const subjectName = getUniqueSubjectName("rename-delete");
  const pdfTitle = getUniquePdfTitle("rename-delete");
  const renamedTitle = getUniquePdfTitle("rename-delete-renamed");
  await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);

  try {
    await createSubject(e2eUser.userId, subjectName);
    await openSubjectInSidebar(page, subjectName);
    await uploadPdfFromSidebar(page, subjectName, pdfTitle);

    await openPdfActions(page);
    await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
    const renameDialog = page.getByRole("dialog", { name: "Rename PDF" });
    await renameDialog.getByRole("textbox").fill(renamedTitle);
    await renameDialog.getByRole("button", { name: "Save Title" }).click();
    await expect(renameDialog).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: renamedTitle }),
    ).toBeVisible();

    await openPdfActions(page);
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Delete PDF" });
    await deleteDialog.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByTestId("home-greeting")).toBeVisible();
    await expect
      .poll(() => getPdfByTitle(e2eUser.userId, renamedTitle))
      .toBeNull();
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});
