import type { Page } from "@playwright/test";
import { documentText, emptyDocument } from "@/lib/editor/document";
import { testDocument } from "@/test/document";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserFoldersByNames,
  createFolder,
  createNote,
  getNoteById,
} from "./support/db";
import { DocumentChatFixture } from "./support/document-chat-fixture";

async function requestDocumentChanges(page: Page): Promise<void> {
  const composer = page.getByRole("textbox", {
    name: "Message the assistant",
  });
  await composer.fill("Improve this document");
  await composer.press("Enter");
  await expect(
    page.getByRole("button", { name: "Accept changes", exact: true }),
  ).toBeVisible();
}

test("reviews note changes, applies through autosave, and preserves them after reload", async ({
  page,
  e2eUser,
}) => {
  const name = getPrefixedValue("assistant-document", "note");
  const folder = await createFolder(e2eUser.userId, name);
  const note = await createNote(
    e2eUser.userId,
    folder.id,
    "Original note",
    "<p>Original explanation.</p><p>Preserve this paragraph.</p>",
  );
  await new DocumentChatFixture().install(page);
  try {
    await page.goto(`/folders/${folder.id}/documents/notes/${note.id}`);
    await expect(page.locator("#form-edit-note-content")).toContainText(
      "Original explanation.",
    );
    await page.getByRole("button", { name: "Open assistant" }).click();
    await requestDocumentChanges(page);
    expect(
      documentText(
        (await getNoteById(e2eUser.userId, note.id))?.content ??
          emptyDocument(),
      ),
    ).toContain("Original explanation.");
    await page.getByRole("button", { name: "Discard changes" }).click();
    await requestDocumentChanges(page);
    await page
      .getByRole("button", { name: "Accept changes", exact: true })
      .click();
    await expect
      .poll(() => getNoteById(e2eUser.userId, note.id))
      .toMatchObject({
        title: "Improved note title",
        content: testDocument(
          "<p>A clearer explanation.</p><p>Preserve this paragraph.</p>",
        ),
      });
    await page.reload();
    await expect(page.locator("#form-edit-note-title")).toHaveValue(
      "Improved note title",
    );
    await expect(page.locator("#form-edit-note-content")).toContainText(
      "A clearer explanation.",
    );
    await expect(page.locator("#form-edit-note-content")).toContainText(
      "Preserve this paragraph.",
    );
  } finally {
    await clearUserFoldersByNames(e2eUser.userId, [name]);
  }
});
