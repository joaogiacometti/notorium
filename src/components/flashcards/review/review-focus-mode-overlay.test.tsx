import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusModeOverlay } from "@/components/flashcards/review/review-focus-mode-overlay";
import { getDefaultFsrsWeights } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/components/shared/lazy-tiptap-renderer", () => ({
  LazyTiptapRenderer: ({ content }: { content: string }) => (
    <div>{content}</div>
  ),
}));

const scheduler = {
  desiredRetention: 0.9,
  weights: getDefaultFsrsWeights(),
};

const baseHandlers = {
  onReveal: vi.fn(),
  onGrade: vi.fn(),
  onExitFocusMode: vi.fn(),
  onEditFlashcard: vi.fn(),
  onResetFlashcard: vi.fn(),
  onDeleteFlashcard: vi.fn(),
};

function makeCard(): FlashcardReviewEntity {
  return {
    id: "card-1",
    front: "<p>Front</p>",
    back: "<p>Back</p>",
    type: "basic",
    clozeSource: null,
    occlusionImagePathname: null,
    occlusionRegions: null,
    occlusionMaskId: null,
    state: "new",
    dueAt: new Date("2026-03-07T11:00:00.000Z"),
    stability: null,
    difficulty: null,
    ease: 250,
    intervalDays: 0,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    deckId: "deck-1",
    deckName: "Biology",
    deckPath: "Biology",
  };
}

function makeReviewState(card: FlashcardReviewEntity): FlashcardReviewState {
  return {
    cards: [card],
    summary: {
      dueCount: 1,
      totalCount: 1,
    },
    scheduler,
  };
}

describe("FocusModeOverlay", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    document.body.replaceChildren();
    vi.clearAllMocks();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("shows the card actions menu before the focus mode close button", async () => {
    await renderFocusModeOverlay();

    const headerButtons = container.querySelectorAll("button");

    expect(headerButtons[0]?.getAttribute("aria-label")).toBe(
      "Open flashcard actions",
    );
    expect(headerButtons[1]?.getAttribute("aria-label")).toBe(
      "Exit Focus Mode",
    );
  });

  it("runs edit, reset, and delete from the card actions menu", async () => {
    await renderFocusModeOverlay();

    await clickMenuItem("Edit");
    await clickMenuItem("Reset");
    await clickMenuItem("Delete");

    expect(baseHandlers.onEditFlashcard).toHaveBeenCalledOnce();
    expect(baseHandlers.onResetFlashcard).toHaveBeenCalledOnce();
    expect(baseHandlers.onDeleteFlashcard).toHaveBeenCalledOnce();
  });

  it("keeps the card actions menu disabled while review actions are pending", async () => {
    await renderFocusModeOverlay({ isPending: true });

    const headerButtons = container.querySelectorAll("button");
    const actionsButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open flashcard actions"]',
    );

    expect(actionsButton).toBeTruthy();
    expect(actionsButton?.disabled).toBe(true);
    expect(headerButtons[0]).toBe(actionsButton);
    expect(headerButtons[1]?.getAttribute("aria-label")).toBe(
      "Exit Focus Mode",
    );

    await act(async () => {
      actionsButton?.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          ctrlKey: false,
        }),
      );
    });

    expect(document.body.querySelector('[role="menuitem"]')).toBeNull();
  });

  async function clickMenuItem(label: string) {
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Open flashcard actions"]',
        )
        ?.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            button: 0,
            ctrlKey: false,
          }),
        );
    });

    const item = Array.from(
      document.body.querySelectorAll('[role="menuitem"]'),
    ).find((menuItem) => menuItem.textContent?.includes(label));

    expect(item).toBeTruthy();

    await act(async () => {
      item?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
  }

  async function renderFocusModeOverlay(
    overrides: Partial<Parameters<typeof FocusModeOverlay>[0]> = {},
  ) {
    const currentCard = makeCard();

    await act(async () => {
      root.render(
        <FocusModeOverlay
          currentCard={currentCard}
          reviewState={makeReviewState(currentCard)}
          decks={[]}
          progress={0}
          revealed={false}
          isPending={false}
          pendingGrade={null}
          previewLabels={null}
          {...baseHandlers}
          {...overrides}
        />,
      );
    });
  }
});
