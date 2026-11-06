import type { Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import { clearUserFoldersByNames, createFolder } from "./support/db";
import {
  clickFolderDocumentsMenuItem,
  openFolderInSidebar,
} from "./support/folders";
import { MediaStorageUploadFixture } from "./support/media-storage-fixture";
import { buildBlankPdf } from "./support/pdf-file";
import { getPdfByTitle } from "./support/pdfs";

const PDF_DETAIL_URL = /\/folders\/.+\/documents\/pdfs\/.+$/;
const UPLOADED_PDF = buildBlankPdf(3);

function getUniqueFolderName(testTitle: string) {
  return getPrefixedValue("pdf-folder", testTitle);
}

function getUniquePdfTitle(testTitle: string) {
  return getPrefixedValue("pdf", testTitle);
}

async function uploadPdfFromSidebar(
  page: Page,
  folderName: string,
  title: string,
) {
  await clickFolderDocumentsMenuItem(page, folderName, "Add PDF");
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
  const folderName = getUniqueFolderName("upload-read");
  const pdfTitle = getUniquePdfTitle("upload-read");
  await clearUserFoldersByNames(e2eUser.userId, [folderName]);

  try {
    await createFolder(e2eUser.userId, folderName);
    await openFolderInSidebar(page, folderName);
    await uploadPdfFromSidebar(page, folderName, pdfTitle);

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
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});

test("finds an uploaded PDF from global search", async ({ page, e2eUser }) => {
  const folderName = getUniqueFolderName("search");
  const pdfTitle = getUniquePdfTitle("search");
  await clearUserFoldersByNames(e2eUser.userId, [folderName]);

  try {
    await createFolder(e2eUser.userId, folderName);
    await openFolderInSidebar(page, folderName);
    await uploadPdfFromSidebar(page, folderName, pdfTitle);
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
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});

test("keeps mobile reading controls on screen while only the book scrolls", async ({
  page,
  e2eUser,
}) => {
  const folderName = getUniqueFolderName("mobile-scroll");
  const pdfTitle = getUniquePdfTitle("mobile-scroll");
  await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  try {
    await createFolder(e2eUser.userId, folderName);
    await openFolderInSidebar(page, folderName);
    await uploadPdfFromSidebar(page, folderName, pdfTitle);
    await expect(
      page.getByRole("textbox", { name: "Page number" }),
    ).toBeVisible();
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 390, height: 640 },
      { width: 320, height: 640 },
      { width: 844, height: 390 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await expectReaderWithinViewport(page);
    }
    await page.setViewportSize({ width: 390, height: 640 });
    await page
      .getByRole("button", { name: "Table of contents", exact: true })
      .click();
    await expectReaderWithinViewport(page);
    await page
      .getByRole("button", { name: "Table of contents", exact: true })
      .click();
    await page.getByRole("button", { name: "Enter zen mode" }).click();
    await expectReaderWithinViewport(page);
    await page.getByRole("button", { name: "Exit zen mode" }).click();
    await expectReaderWithinViewport(page);
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});

async function expectReaderWithinViewport(page: Page): Promise<void> {
  const controls = page.getByRole("group", { name: "PDF reading controls" });
  await expect
    .poll(() =>
      controls.evaluate((element) => element.getBoundingClientRect().bottom),
    )
    .toBeLessThanOrEqual(page.viewportSize()?.height ?? 0);
  expect(
    await controls.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollHeight - window.innerHeight,
      ),
    )
    .toBeLessThanOrEqual(1);
  const book = page.locator("[data-page-number]").first().locator("../..");
  await book.evaluate((element) => {
    element.scrollTop = 120;
  });
  await expect
    .poll(() => book.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

test("renames and deletes a PDF from its header menu", async ({
  page,
  e2eUser,
}) => {
  const folderName = getUniqueFolderName("rename-delete");
  const pdfTitle = getUniquePdfTitle("rename-delete");
  const renamedTitle = getUniquePdfTitle("rename-delete-renamed");
  await clearUserFoldersByNames(e2eUser.userId, [folderName]);

  try {
    await createFolder(e2eUser.userId, folderName);
    await openFolderInSidebar(page, folderName);
    await uploadPdfFromSidebar(page, folderName, pdfTitle);

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
    await clearUserFoldersByNames(e2eUser.userId, [folderName]);
  }
});
