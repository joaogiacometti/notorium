import type { Page } from "@playwright/test";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import {
  clearUserSubjectsByNames,
  createNote,
  createSubject,
  getNoteById,
} from "./support/db";
import { DocumentChatFixture } from "./support/document-chat-fixture";
import {
  createAssistantTestMindmap,
  readAssistantTestMindmap,
} from "./support/mindmaps";

async function requestDocumentChanges(page: Page): Promise<void> {
  const composer = page.getByRole("textbox", {
    name: "Message the study assistant",
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
  const subject = await createSubject(e2eUser.userId, name);
  const note = await createNote(
    e2eUser.userId,
    subject.id,
    "Original note",
    "<p>Original explanation.</p><p>Preserve this paragraph.</p>",
  );
  await new DocumentChatFixture().install(page);
  try {
    await page.goto(`/subjects/${subject.id}/documents/notes/${note.id}`);
    await expect(page.locator("#form-edit-note-content")).toContainText(
      "Original explanation.",
    );
    await page.getByRole("button", { name: "Open study assistant" }).click();
    await requestDocumentChanges(page);
    expect((await getNoteById(e2eUser.userId, note.id))?.content).toContain(
      "Original explanation.",
    );
    await page.getByRole("button", { name: "Discard changes" }).click();
    await requestDocumentChanges(page);
    await page
      .getByRole("button", { name: "Accept changes", exact: true })
      .click();
    await expect
      .poll(() => getNoteById(e2eUser.userId, note.id))
      .toMatchObject({
        title: "Improved note title",
        content: "<p>A clearer explanation.</p><p>Preserve this paragraph.</p>",
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
    await clearUserSubjectsByNames(e2eUser.userId, [name]);
  }
});

test("applies mindmap changes and restores graph and title with undo", async ({
  page,
  e2eUser,
}) => {
  const name = getPrefixedValue("assistant-document", "mindmap");
  const subject = await createSubject(e2eUser.userId, name);
  const map = await createAssistantTestMindmap(e2eUser.userId, subject.id);
  await new DocumentChatFixture().install(page);
  try {
    await page.goto(`/subjects/${subject.id}/documents/mindmaps/${map.id}`);
    await expect(
      page.locator(".react-flow__node").filter({ hasText: "Original branch" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Open study assistant" }).click();
    await requestDocumentChanges(page);
    expect(
      (await readAssistantTestMindmap(e2eUser.userId, map.id))?.data,
    ).toContain("Original branch");
    await page
      .getByRole("button", { name: "Accept changes", exact: true })
      .click();
    await expect
      .poll(() => readAssistantTestMindmap(e2eUser.userId, map.id))
      .toMatchObject({ title: "Improved map title" });
    await expect
      .poll(
        async () =>
          (await readAssistantTestMindmap(e2eUser.userId, map.id))?.data,
      )
      .toContain("Improved branch");
    await page
      .getByRole("button", { name: "Minimize study assistant" })
      .click();
    await page.getByRole("button", { name: /^Undo/ }).click();
    await expect(
      page.getByRole("textbox", { name: "Mindmap title" }),
    ).toHaveValue("Original map");
    await page.getByRole("button", { name: /^Redo/ }).click();
    await expect
      .poll(() => readAssistantTestMindmap(e2eUser.userId, map.id))
      .toMatchObject({ title: "Improved map title" });
    await page.reload();
    await expect(
      page.getByRole("textbox", { name: "Mindmap title" }),
    ).toHaveValue("Improved map title");
    await expect(
      page.locator(".react-flow__node").filter({ hasText: "Improved branch" }),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [name]);
  }
});
