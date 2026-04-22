import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BulkMoveFlashcardsDialog } from "@/components/flashcards/manage/bulk-move-flashcards-dialog";
import type { DeckOption } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const { bulkMoveFlashcardsMock, getDecksMock, toastErrorMock } = vi.hoisted(
  () => ({
    bulkMoveFlashcardsMock: vi.fn(),
    getDecksMock: vi.fn(),
    toastErrorMock: vi.fn(),
  }),
);

vi.mock("@/app/actions/decks", () => ({
  getDecks: getDecksMock,
}));

vi.mock("@/app/actions/flashcards", () => ({
  bulkMoveFlashcards: bulkMoveFlashcardsMock,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

const decks: DeckOption[] = [
  {
    id: "deck-1",
    userId: "user-1",
    parentDeckId: null,
    name: "Spanish",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    path: "Languages::Spanish",
  },
  {
    id: "deck-2",
    userId: "user-1",
    parentDeckId: "deck-1",
    name: "Verbs",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    path: "Languages::Spanish::Verbs",
  },
];

function getCombobox(): HTMLButtonElement {
  const combobox = document.body.querySelector('button[role="combobox"]');

  if (!(combobox instanceof HTMLButtonElement)) {
    throw new TypeError("Expected combobox trigger button");
  }

  return combobox;
}

function getCommandItems(): HTMLElement[] {
  return Array.from(
    document.body.querySelectorAll('[data-slot="command-item"]'),
  ).filter((item): item is HTMLElement => item instanceof HTMLElement);
}

describe("BulkMoveFlashcardsDialog", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    getDecksMock.mockResolvedValue(decks);
    bulkMoveFlashcardsMock.mockResolvedValue({
      success: true,
      ids: ["flashcard-1"],
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("does not refetch decks or reset the selected deck on rerender with the same ids", async () => {
    const onMoved = vi.fn();
    const onOpenChange = vi.fn();
    const ids = ["flashcard-1"];

    await act(async () => {
      root.render(
        <BulkMoveFlashcardsDialog
          ids={ids}
          open
          onMoved={onMoved}
          onOpenChange={onOpenChange}
        />,
      );
    });

    await act(async () => {});

    expect(getDecksMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      getCombobox().click();
    });

    const deckOption = getCommandItems().find((item) =>
      item.textContent?.includes("Languages::Spanish::Verbs"),
    );

    expect(deckOption).toBeTruthy();

    await act(async () => {
      deckOption?.click();
    });

    expect(getCombobox().textContent).toContain("Languages::Spanish::Verbs");

    await act(async () => {
      root.render(
        <BulkMoveFlashcardsDialog
          ids={ids}
          open
          onMoved={onMoved}
          onOpenChange={onOpenChange}
        />,
      );
    });

    await act(async () => {});

    expect(getDecksMock).toHaveBeenCalledTimes(1);
    expect(getCombobox().textContent).toContain("Languages::Spanish::Verbs");
  });
});
