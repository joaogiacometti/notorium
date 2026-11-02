import { AssistantChatFixture } from "./support/assistant-chat-fixture";
import { expect, test } from "./support/authenticated-test";

test("starts a fresh chat from the composer command menu without sending a command to AI", async ({
  page,
}) => {
  const assistant = new AssistantChatFixture();
  await assistant.install(page);
  await page.goto("/flashcards?view=manage");
  await page.getByRole("button", { name: "Open study assistant" }).click();
  const composer = page.getByRole("textbox", {
    name: "Message the study assistant",
  });
  await composer.fill("Explain retrieval practice");
  await composer.press("Enter");
  await expect(
    page.getByText("I can help you study.", { exact: true }),
  ).toBeVisible();
  await composer.fill("/n");
  await expect(
    page.getByRole("listbox", { name: "Assistant commands" }),
  ).toBeVisible();
  await composer.press("Escape");
  await expect(composer).toBeVisible();
  await expect(composer).toHaveValue("/n");
  await expect(
    page.getByRole("listbox", { name: "Assistant commands" }),
  ).toHaveCount(0);
  await composer.fill("/ne");
  await page.getByRole("option", { name: /New chat/ }).click();
  await expect(composer).toBeFocused();
  await expect(composer).toHaveValue("");
  await expect(
    page.getByText("Explain retrieval practice", { exact: true }),
  ).toHaveCount(0);
  expect(assistant.requests).toHaveLength(1);
  await composer.fill("Explain spaced repetition");
  await composer.press("Enter");
  await expect.poll(() => assistant.requests.length).toBe(2);
  expect(assistant.requests[1]?.messages).toHaveLength(1);
  await page
    .getByRole("button", { name: "New Flashcard", exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "New flashcard" });
  await expect(editor).toBeVisible();
  await composer.fill("/n");
  await expect(
    page.getByRole("listbox", { name: "Assistant commands" }),
  ).toBeVisible();
  await composer.press("Escape");
  await expect(
    page.getByRole("listbox", { name: "Assistant commands" }),
  ).toHaveCount(0);
  await expect(composer).toBeVisible();
  await expect(editor).toBeVisible();
  await composer.fill("/new");
  await composer.press("Enter");
  await expect(composer).toHaveValue("");
  await expect(composer).toBeFocused();
  expect(assistant.requests).toHaveLength(2);
});
