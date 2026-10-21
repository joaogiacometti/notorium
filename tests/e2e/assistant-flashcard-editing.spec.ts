import type { Locator, Page } from "@playwright/test";
import { AssistantChatFixture } from "./support/assistant-chat-fixture";
import { expect, test } from "./support/authenticated-test";
import { getPrefixedValue } from "./support/data";
import { clearUserSubjectsByNames, createSubject } from "./support/db";
import { createFlashcardForSubject } from "./support/flashcards";

async function askAssistant(page: Page, text: string): Promise<void> {
  const message = page.getByRole("textbox", {
    name: "Message the study assistant",
  });
  await message.fill(text);
  await message.press("Enter");
}

async function replaceEditor(editor: Locator, text: string): Promise<void> {
  await editor.fill(text);
}

test("improves an unsaved card and keeps one conversation across review and editing", async ({
  page,
  e2eUser,
}) => {
  const subjectName = getPrefixedValue("assistant-edit", "draft");
  const front = getPrefixedValue("assistant-card", "draft");
  const subject = await createSubject(e2eUser.userId, subjectName);
  await new AssistantChatFixture().install(page);
  try {
    await page.goto(`/flashcards?view=manage&subjectId=${subject.id}`);
    await page.getByRole("button", { name: "Open study assistant" }).click();
    await askAssistant(page, "Explain retrieval practice");
    await expect(
      page.getByText("I can help you study.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "New Flashcard", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Create Flashcard" });
    await replaceEditor(dialog.locator("#form-create-flashcard-front"), front);
    await replaceEditor(
      dialog.locator("#form-create-flashcard-back"),
      "A long original answer.",
    );
    await expect(
      page.getByText("I can help you study.", { exact: true }),
    ).toBeVisible();
    await askAssistant(page, "Improve this flashcard");
    await expect(
      dialog.getByRole("button", { name: "Accept back" }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Create Flashcard", exact: true }),
    ).toBeDisabled();
    await dialog.getByRole("button", { name: "Accept back" }).click();
    await expect(dialog.locator("#form-create-flashcard-back")).toContainText(
      "A concise improved answer.",
    );
    await dialog
      .getByRole("button", { name: "Create Flashcard", exact: true })
      .click();
    await expect(page.getByTitle(front, { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Close flashcard editor" }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("tab", { name: "Review", exact: true }).click();
    await page
      .getByRole("button", { name: "Start review", exact: true })
      .click();
    await expect(
      page.getByText("I can help you study.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Message the study assistant" })
      .fill("e 1");
    await expect(
      page.getByRole("progressbar", { name: "Review progress" }),
    ).toBeVisible();
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});

test("reviews mobile suggestions in the inputs and auto-saves accepted detail edits", async ({
  page,
  e2eUser,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const subjectName = getPrefixedValue("assistant-edit", "mobile");
  const subject = await createSubject(e2eUser.userId, subjectName);
  const card = await createFlashcardForSubject(
    e2eUser.userId,
    subject.id,
    "<p>What is recall?</p>",
    "<p>A long original answer.</p>",
  );
  await new AssistantChatFixture().install(page);
  try {
    await page.goto(`/flashcards/${card.id}`);
    await page.getByRole("button", { name: "Open study assistant" }).click();
    await askAssistant(page, "Improve this answer");
    await expect(
      page.getByText("Review suggested changes in the editor."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Minimize study assistant" })
      .click();
    await page.getByRole("button", { name: "Discard back" }).click();
    await expect(page.locator("#form-edit-flashcard-back")).toContainText(
      "A long original answer.",
    );
    await page.getByRole("button", { name: "Open study assistant" }).click();
    await askAssistant(page, "Try a shorter answer");
    await expect(
      page.getByText("Review suggested changes in the editor."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Minimize study assistant" })
      .click();
    const save = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes(`/flashcards/${card.id}`),
    );
    await page.getByRole("button", { name: "Accept back" }).click();
    await expect(page.locator("#form-edit-flashcard-back")).toContainText(
      "A concise improved answer.",
    );
    await save;
    await page.reload();
    await expect(page.locator("#form-edit-flashcard-back")).toContainText(
      "A concise improved answer.",
    );
  } finally {
    await clearUserSubjectsByNames(e2eUser.userId, [subjectName]);
  }
});
