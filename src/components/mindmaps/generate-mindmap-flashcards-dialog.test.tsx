import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GenerateMindmapFlashcardsDialog } from "@/components/mindmaps/generate-mindmap-flashcards-dialog";
import type { DeckOption } from "@/lib/server/api-contracts";

const { generateMock, createMock, toastErrorMock, toastSuccessMock } =
  vi.hoisted(() => ({
    generateMock: vi.fn(),
    createMock: vi.fn(),
    toastErrorMock: vi.fn(),
    toastSuccessMock: vi.fn(),
  }));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/flashcard-generation", () => ({
  generateFlashcardsFromMindmap: generateMock,
}));

vi.mock("@/app/actions/flashcards", () => ({
  createFlashcard: createMock,
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}));

vi.mock("@/components/shared/deck-select", () => ({
  DeckSelect: () => null,
}));

// Surface the review step as a single button that creates the generated cards,
// so the dialog's generate -> review -> create flow can be driven end to end.
vi.mock("@/components/flashcards/dialogs/generate-flashcards-review", () => ({
  GenerateFlashcardsReview: ({
    cards,
    onCreate,
  }: {
    cards: Array<{ front: string; back: string }>;
    onCreate: (cards: Array<{ front: string; back: string }>) => void;
  }) => (
    <button
      type="button"
      data-testid="review-create"
      onClick={() => onCreate(cards)}
    >
      review {cards.length}
    </button>
  ),
}));

const deck: DeckOption = {
  id: "deck-1",
  userId: "user-1",
  parentDeckId: null,
  name: "Biology",
  path: "Biology",
  createdAt: new Date("2026-04-20T10:00:00.000Z"),
  updatedAt: new Date("2026-04-20T10:00:00.000Z"),
};

function findButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  );
}

describe("GenerateMindmapFlashcardsDialog", () => {
  let container: HTMLDivElement;
  let root: Root;
  let onOpenChange: ReturnType<typeof vi.fn<(open: boolean) => void>>;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    generateMock.mockReset();
    createMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    onOpenChange = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    act(() => {
      root = createRoot(container);
      root.render(
        <GenerateMindmapFlashcardsDialog
          decks={[deck]}
          mindmapId="mindmap-1"
          open
          onOpenChange={onOpenChange}
        />,
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("shows a mapped error toast when generation fails", async () => {
    generateMock.mockResolvedValue({
      success: false,
      errorCode: "flashcards.ai.emptyGeneration",
    });

    await act(async () => {
      findButton(document.body, "Generate Flashcards")?.click();
      await Promise.resolve();
    });

    expect(generateMock).toHaveBeenCalledWith({
      mindmapId: "mindmap-1",
      deckId: "deck-1",
    });
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Could not extract flashcards from this mindmap. Try adding more detail.",
    );
  });

  it("creates the generated cards and closes after review", async () => {
    generateMock.mockResolvedValue({
      success: true,
      cards: [{ front: "<p>F</p>", back: "<p>B</p>" }],
    });
    createMock.mockResolvedValue({ success: true, flashcard: { id: "fc-1" } });

    await act(async () => {
      findButton(document.body, "Generate Flashcards")?.click();
      await Promise.resolve();
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('[data-testid="review-create"]')
        ?.click();
      await Promise.resolve();
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith("Created 1 flashcard");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
