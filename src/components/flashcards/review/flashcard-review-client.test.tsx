import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getExamFlashcards,
  getFlashcardReviewState,
  reviewFlashcard,
  undoFlashcardReview,
} from "@/app/actions/flashcard-review";
import { FlashcardReviewClient } from "@/components/flashcards/review/flashcard-review-client";
import { getDefaultFsrsWeights } from "@/features/flashcards/fsrs";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/flashcard-review", () => ({
  getExamFlashcards: vi.fn(),
  getFlashcardReviewState: vi.fn(),
  reviewFlashcard: vi.fn(),
  undoFlashcardReview: vi.fn(),
}));

vi.mock("@/components/flashcards/dialogs/delete-flashcard-dialog", () => ({
  DeleteFlashcardDialog: () => null,
}));

vi.mock("@/components/flashcards/dialogs/reset-flashcard-dialog", () => ({
  ResetFlashcardDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="reset-flashcard-dialog" /> : null,
}));

vi.mock("@/components/flashcards/dialogs/lazy-edit-flashcard-dialog", () => ({
  LazyEditFlashcardDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="edit-flashcard-dialog" /> : null,
}));

vi.mock("@/components/flashcards/review/exam-results-screen", () => ({
  ExamResultsScreen: () => null,
}));

vi.mock("@/components/flashcards/review/review-focus-mode-overlay", () => ({
  FocusModeOverlay: ({
    currentCard,
    isExamMode,
    canUndoReview,
    onGrade,
    onUndoReview,
  }: {
    currentCard?: { id: string } | null;
    isExamMode?: boolean;
    canUndoReview: boolean;
    onGrade: (grade: "good") => void;
    onUndoReview: () => void;
  }) => (
    <div
      data-current-card-id={currentCard?.id}
      data-testid={isExamMode ? "exam-focus-mode" : "review-focus-mode"}
    >
      <button type="button" onClick={() => onGrade("good")}>
        Grade good
      </button>
      {canUndoReview ? (
        <button type="button" onClick={onUndoReview}>
          Undo last review
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("@/components/shortcuts/shortcuts-suspension-context", () => ({
  useShortcutsDialogOpen: () => false,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const getFlashcardReviewStateMock = vi.mocked(getFlashcardReviewState);
const getExamFlashcardsMock = vi.mocked(getExamFlashcards);
const reviewFlashcardMock = vi.mocked(reviewFlashcard);
const undoFlashcardReviewMock = vi.mocked(undoFlashcardReview);

const scheduler = {
  desiredRetention: 0.9,
  weights: getDefaultFsrsWeights(),
};

function makeCard(id: string): FlashcardReviewEntity {
  return {
    id,
    front: `<p>${id} front</p>`,
    back: `<p>${id} back</p>`,
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
    subjectId: "deck-1",
    subjectName: "Biology",
    subjectPath: "Biology",
  };
}

function makeReviewState(
  dueCount: number,
  cards: FlashcardReviewEntity[] = [],
): FlashcardReviewState {
  return {
    cards,
    summary: {
      dueCount,
      totalCount: Math.max(dueCount, cards.length),
    },
    scheduler,
  };
}

function createDeferred<T>() {
  let resolvePromise: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise,
  };
}

function setDocumentVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value,
  });
}

describe("FlashcardReviewClient", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    setDocumentVisibility("visible");
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
    setDocumentVisibility("visible");
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("refreshes review counts when the document becomes visible again", async () => {
    getFlashcardReviewStateMock.mockResolvedValue(makeReviewState(5));

    await renderReviewClient(makeReviewState(8));

    expect(container.textContent).toContain("8 due");

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(getFlashcardReviewStateMock).toHaveBeenCalledWith({
      subjectId: undefined,
      limit: 50,
    });
    expect(container.textContent).toContain("5 due");
  });

  it("refreshes review counts when the window receives focus", async () => {
    getFlashcardReviewStateMock.mockResolvedValue(makeReviewState(3));

    await renderReviewClient(makeReviewState(8));

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(getFlashcardReviewStateMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("3 due");
  });

  it("does not start a duplicate return refresh while one is in flight", async () => {
    const deferred = createDeferred<FlashcardReviewState>();
    getFlashcardReviewStateMock.mockReturnValue(deferred.promise);

    await renderReviewClient(makeReviewState(8));

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(getFlashcardReviewStateMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(makeReviewState(4));
      await deferred.promise;
    });

    expect(container.textContent).toContain("4 due");
  });

  it("skips return refresh while exam mode is active", async () => {
    const card = makeCard("card-1");
    getExamFlashcardsMock.mockResolvedValue([card]);

    await renderReviewClient(makeReviewState(1, [card]));

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="flashcard-exam-start-button"]',
        )
        ?.click();
    });

    await act(async () => {});

    expect(
      document.body.querySelector('[data-testid="exam-focus-mode"]'),
    ).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(getFlashcardReviewStateMock).not.toHaveBeenCalled();
  });

  it("skips return refresh while review focus mode is active", async () => {
    await renderReviewClient(makeReviewState(1, [makeCard("card-1")]));

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="flashcard-review-start-button"]',
        )
        ?.click();
    });

    expect(
      document.body.querySelector('[data-testid="review-focus-mode"]'),
    ).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(getFlashcardReviewStateMock).not.toHaveBeenCalled();
  });

  it("submits grades through the review server action", async () => {
    const card = makeCard("card-1");
    reviewFlashcardMock.mockResolvedValue({
      success: true,
      reviewedCardId: "card-1",
      reviewLogId: "review-log-1",
      flashcard: { ...card, reviewCount: 1 },
    });
    undoFlashcardReviewMock.mockResolvedValue({
      success: true,
      flashcard: card,
    });

    await renderReviewClient(makeReviewState(1, [card]));

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="flashcard-review-start-button"]',
        )
        ?.click();
    });

    await act(async () => {
      document.body.querySelector<HTMLButtonElement>("button")?.click();
    });

    expect(reviewFlashcardMock).toHaveBeenCalledWith({
      id: "card-1",
      grade: "good",
      clientReviewId: expect.any(String),
    });
  });

  it("refreshes the active subject after undo and ignores an older refill", async () => {
    const reviewedCard = {
      ...makeCard("card-1"),
      state: "review" as const,
      dueAt: new Date("2026-04-07T11:00:00.000Z"),
      reviewCount: 1,
    };
    const chemistryCard = {
      ...makeCard("card-2"),
      subjectId: "deck-2",
      subjectName: "Chemistry",
      subjectPath: "Chemistry",
    };
    const staleRefill = createDeferred<FlashcardReviewState>();
    getFlashcardReviewStateMock
      .mockReturnValueOnce(staleRefill.promise)
      .mockResolvedValueOnce(makeReviewState(1, [chemistryCard]));
    reviewFlashcardMock.mockResolvedValue({
      success: true,
      reviewedCardId: "card-1",
      reviewLogId: "review-log-1",
      flashcard: reviewedCard,
    });
    undoFlashcardReviewMock.mockResolvedValue({
      success: true,
      flashcard: makeCard("card-1"),
    });

    await renderReviewClient(
      makeReviewState(2, [makeCard("card-1")]),
      "deck-1",
    );

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="flashcard-review-start-button"]',
        )
        ?.click();
    });

    await act(async () => {
      document.body.querySelector<HTMLButtonElement>("button")?.click();
    });

    await renderReviewClient(makeReviewState(1, [chemistryCard]), "deck-2");

    await act(async () => {
      Array.from(document.body.querySelectorAll("button"))
        .find((button) => button.textContent === "Undo last review")
        ?.click();
    });

    await vi.waitFor(() => {
      expect(getFlashcardReviewStateMock).toHaveBeenLastCalledWith({
        subjectId: "deck-2",
        limit: 50,
      });
      expect(
        document.body.querySelector('[data-current-card-id="card-2"]'),
      ).toBeTruthy();
    });

    await act(async () => {
      staleRefill.resolve(makeReviewState(1, [makeCard("stale-card")]));
      await staleRefill.promise;
    });

    expect(
      document.body.querySelector('[data-current-card-id="card-2"]'),
    ).toBeTruthy();
    expect(
      document.body.querySelector('[data-current-card-id="stale-card"]'),
    ).toBeFalsy();
  });

  it("opens reset confirmation on uppercase R in focus mode", async () => {
    await renderReviewClient(makeReviewState(1, [makeCard("card-1")]));

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="flashcard-review-start-button"]',
        )
        ?.click();
    });

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "R" }));
    });

    expect(
      document.body.querySelector('[data-testid="reset-flashcard-dialog"]'),
    ).toBeTruthy();
  });

  it("keeps focus mode on Escape while the edit dialog is open", async () => {
    await renderReviewClient(makeReviewState(1, [makeCard("card-1")]));

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="flashcard-review-start-button"]',
        )
        ?.click();
    });

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
    });

    expect(
      document.body.querySelector('[data-testid="edit-flashcard-dialog"]'),
    ).toBeTruthy();

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(
      document.body.querySelector('[data-testid="review-focus-mode"]'),
    ).toBeTruthy();
  });

  async function renderReviewClient(
    initialState: FlashcardReviewState,
    subjectId?: string,
  ) {
    await act(async () => {
      root.render(
        <FlashcardReviewClient
          initialState={initialState}
          subjects={[]}
          subjectId={subjectId}
          aiEnabled={false}
        />,
      );
    });
  }
});
