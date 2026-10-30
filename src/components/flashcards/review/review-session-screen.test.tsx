import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewSessionScreen } from "@/components/flashcards/review/review-session-screen";
import { formatFlashcardsAsMarkdown } from "@/lib/clipboard/flashcard-content";
import type { FlashcardReviewEntity } from "@/lib/server/api-contracts";
import { FakeClipboard } from "@/test/fake-clipboard";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/flashcards", () => ({
  editFlashcard: vi.fn(),
}));

vi.mock("@/components/shared/lazy-tiptap-renderer", () => ({
  LazyTiptapRenderer: ({ content }: { content: string }) => (
    <div>{content}</div>
  ),
}));

const baseHandlers = {
  onReveal: vi.fn(),
  onGrade: vi.fn(),
  onExit: vi.fn(),
  onEditFlashcard: vi.fn(),
  onResetFlashcard: vi.fn(),
  onDeleteFlashcard: vi.fn(),
  onUndoReview: vi.fn(),
  onStopEditing: vi.fn(),
  onFlashcardUpdated: vi.fn(),
  onToggleStudyLater: vi.fn(),
};

function makeCard(): FlashcardReviewEntity {
  return {
    id: "card-1",
    front: "<p>Front</p>",
    back: "<p>Back</p>",
    state: "new",
    dueAt: new Date("2026-03-07T11:00:00.000Z"),
    stability: null,
    difficulty: null,
    intervalDays: 0,
    learningStep: null,
    lastReviewedAt: null,
    reviewCount: 0,
    lapseCount: 0,
    studyLaterAt: null,
    subjectId: "deck-1",
    subjectName: "Biology",
    subjectPath: "Biology",
  };
}

describe("ReviewSessionScreen", () => {
  let container: HTMLDivElement;
  let root: Root;
  let clipboard: FakeClipboard | null = null;

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
    clipboard?.uninstall();
    clipboard = null;
    vi.clearAllMocks();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("shows the source only after revealing the answer", async () => {
    const currentCard = {
      ...makeCard(),
      source: {
        kind: "note" as const,
        id: "n1",
        title: "Cells",
        subjectId: "biology",
      },
    };
    await renderReviewSessionScreen({ currentCard, revealed: false });
    expect(container.querySelector('a[aria-label^="Source note"]')).toBeNull();
    await renderReviewSessionScreen({ currentCard, revealed: true });
    expect(
      container
        .querySelector('a[aria-label^="Source note"]')
        ?.getAttribute("href"),
    ).toBe("/subjects/biology/documents/notes/n1");
  });

  it("shows the card actions menu before the exit button", async () => {
    await renderReviewSessionScreen();

    const headerButtons = container.querySelectorAll("button");

    expect(headerButtons[0]?.getAttribute("aria-label")).toBe(
      "Open review actions",
    );
    expect(headerButtons[1]?.getAttribute("aria-label")).toBe("Exit review");
  });

  it("runs edit, reset, and delete from the card actions menu", async () => {
    await renderReviewSessionScreen();

    await clickMenuItem("Edit");
    await clickMenuItem("Reset");
    await clickMenuItem("Delete");

    expect(baseHandlers.onEditFlashcard).toHaveBeenCalledOnce();
    expect(baseHandlers.onResetFlashcard).toHaveBeenCalledOnce();
    expect(baseHandlers.onDeleteFlashcard).toHaveBeenCalledOnce();
  });

  it("marks the card study later from the card actions menu", async () => {
    const onToggleStudyLater = vi.fn();
    await renderReviewSessionScreen({ onToggleStudyLater });

    const item = await clickMenuItem("Study later");

    expect(item?.getAttribute("aria-checked")).toBe("false");
    expect(onToggleStudyLater).toHaveBeenCalledOnce();
    expect(container.textContent).not.toContain("Study later");
  });

  it("labels a marked card and shows the menu item checked", async () => {
    const onToggleStudyLater = vi.fn();
    await renderReviewSessionScreen({
      currentCard: { ...makeCard(), studyLaterAt: new Date() },
      onToggleStudyLater,
    });

    expect(container.textContent).toContain("Study later");
    const item = await clickMenuItem("Study later");

    expect(item?.getAttribute("aria-checked")).toBe("true");
    expect(onToggleStudyLater).toHaveBeenCalledOnce();
  });

  it("offers study later in exam mode too", async () => {
    const onToggleStudyLater = vi.fn();
    await renderReviewSessionScreen({
      currentCard: { ...makeCard(), studyLaterAt: new Date() },
      isExamMode: true,
      onToggleStudyLater,
    });

    expect(container.textContent).toContain("Study later");
    const item = await clickMenuItem("Study later");

    expect(item?.getAttribute("aria-checked")).toBe("true");
    expect(onToggleStudyLater).toHaveBeenCalledOnce();
  });

  it("copies the current card as Markdown from the card actions menu", async () => {
    clipboard = new FakeClipboard().install();
    await renderReviewSessionScreen();

    await clickMenuItem("Copy");

    expect(clipboard?.lastText()).toBe(
      formatFlashcardsAsMarkdown([
        { front: "<p>Front</p>", back: "<p>Back</p>", subjectPath: "Biology" },
      ]),
    );
  });

  it("offers the latest review undo from the card actions menu", async () => {
    await renderReviewSessionScreen({ canUndoReview: true });

    await clickMenuItem("Undo last review");

    expect(baseHandlers.onUndoReview).toHaveBeenCalledOnce();
  });

  it("keeps undo available after the last due card is graded", async () => {
    await renderReviewSessionScreen({
      currentCard: null,
      canUndoReview: true,
    });

    await clickMenuItem("Undo last review");

    expect(baseHandlers.onUndoReview).toHaveBeenCalledOnce();
  });

  it("shows loading instead of caught up while more due cards are loading", async () => {
    await renderReviewSessionScreen({
      currentCard: null,
      isLoadingMoreCards: true,
    });

    expect(document.body.textContent).toContain("Loading more cards");
    expect(document.body.textContent).not.toContain("All caught up");

    await act(async () => {
      Array.from(document.body.querySelectorAll("button"))
        .find((button) => button.textContent === "Back to flashcards")
        ?.click();
    });

    expect(baseHandlers.onExit).toHaveBeenCalledOnce();
  });

  it("keeps the card actions menu disabled while review actions are pending", async () => {
    await renderReviewSessionScreen({ isPending: true });

    const headerButtons = container.querySelectorAll("button");
    const actionsButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Review action in progress"]',
    );

    expect(actionsButton).toBeTruthy();
    expect(actionsButton?.disabled).toBe(true);
    expect(actionsButton?.getAttribute("aria-busy")).toBe("true");
    expect(headerButtons[0]).toBe(actionsButton);
    expect(headerButtons[1]?.getAttribute("aria-label")).toBe("Exit review");

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

  it("does not show scheduling outcomes before the user grades the card", async () => {
    await renderReviewSessionScreen({
      revealed: true,
    });

    const gradeButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        "button[aria-keyshortcuts]",
      ),
    );

    expect(gradeButtons.map((button) => button.textContent)).toEqual([
      "Again",
      "Hard",
      "Good",
      "Easy",
    ]);
  });

  async function clickMenuItem(label: string) {
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Open review actions"]',
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
      document.body.querySelectorAll(
        '[role="menuitem"], [role="menuitemcheckbox"]',
      ),
    ).find((menuItem) => menuItem.textContent?.includes(label));

    expect(item).toBeTruthy();

    await act(async () => {
      item?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    return item;
  }

  async function renderReviewSessionScreen(
    overrides: Partial<Parameters<typeof ReviewSessionScreen>[0]> = {},
  ) {
    const currentCard = makeCard();

    await act(async () => {
      root.render(
        <ReviewSessionScreen
          currentCard={currentCard}
          headerText="1 due of 1 total cards"
          subjects={[]}
          progress={0}
          revealed={false}
          isPending={false}
          canUndoReview={false}
          editing={false}
          aiEnabled={false}
          {...baseHandlers}
          {...overrides}
        />,
      );
    });
  }
});
