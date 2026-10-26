import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FlashcardsManagerReadFailure } from "@/components/flashcards/manage/flashcards-manager-read-failure";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
});

it("offers retry and dismiss after a failed flashcard read", async () => {
  const retry = vi.fn();
  const dismiss = vi.fn();

  await act(async () => {
    root.render(
      <FlashcardsManagerReadFailure
        message="Could not open this flashcard."
        retrying={false}
        onRetry={retry}
        onDismiss={dismiss}
      />,
    );
  });

  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "Could not open this flashcard.",
  );
  await act(async () => {
    container.querySelector<HTMLButtonElement>("button")?.click();
  });
  expect(retry).toHaveBeenCalledOnce();

  await act(async () => {
    root.render(
      <FlashcardsManagerReadFailure
        message="Could not open this flashcard."
        retrying
        onRetry={retry}
        onDismiss={dismiss}
      />,
    );
  });
  expect(container.querySelector<HTMLButtonElement>("button")?.disabled).toBe(
    true,
  );
  await act(async () => {
    container.querySelectorAll<HTMLButtonElement>("button")[1]?.click();
  });
  expect(dismiss).toHaveBeenCalledOnce();
});
