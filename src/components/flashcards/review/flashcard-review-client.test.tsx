import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  reviewFlashcard,
  undoFlashcardReview,
} from "@/app/actions/flashcard-review";
import { FlashcardReviewClient } from "@/components/flashcards/review/flashcard-review-client";
import {
  createDeferred,
  makeCard,
  makeReviewState,
  setDocumentVisibility,
} from "@/components/flashcards/review/flashcard-review-client-test-support";
import {
  fetchExamFlashcards,
  fetchFlashcardReviewState,
} from "@/lib/read-api/flashcards";
import type {
  FlashcardReviewEntity,
  FlashcardReviewState,
} from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/flashcard-review", () => ({
  reviewFlashcard: vi.fn(),
  undoFlashcardReview: vi.fn(),
}));

vi.mock("@/lib/read-api/flashcards", () => ({
  fetchExamFlashcards: vi.fn(),
  fetchFlashcardReviewState: vi.fn(),
}));

vi.mock("@/components/flashcards/dialogs/delete-flashcard-dialog", () => ({
  DeleteFlashcardDialog: () => null,
}));

vi.mock("@/components/flashcards/dialogs/reset-flashcard-dialog", () => ({
  ResetFlashcardDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="reset-flashcard-dialog" /> : null,
}));

vi.mock("@/components/flashcards/dialogs/lazy-edit-flashcard-dialog", () => ({
  LazyEditFlashcardDialog: ({
    open,
    flashcard,
    onUpdated,
  }: {
    open: boolean;
    flashcard: { id: string; subjectId: string | null };
    onUpdated?: (card: { id: string; subjectId: string }) => void;
  }) =>
    open ? (
      <div data-testid="edit-flashcard-dialog">
        <button
          type="button"
          onClick={() => onUpdated?.({ ...flashcard, subjectId: "deck-9" })}
        >
          Save moved card
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/flashcards/review/exam-results-screen", () => ({
  ExamResultsScreen: () => null,
}));

vi.mock("@/components/flashcards/review/review-focus-mode-overlay", () => ({
  FocusModeOverlay: ({
    currentCard,
    isExamMode,
    isLoadingMoreCards,
    canUndoReview,
    onGrade,
    onUndoReview,
    onEditFlashcard,
  }: {
    currentCard?: { id: string } | null;
    isExamMode?: boolean;
    isLoadingMoreCards?: boolean;
    canUndoReview: boolean;
    onGrade: (grade: "good") => void;
    onUndoReview: () => void;
    onEditFlashcard: () => void;
  }) => (
    <div
      data-current-card-id={currentCard?.id}
      data-loading-more-cards={isLoadingMoreCards ? "true" : "false"}
      data-testid={isExamMode ? "exam-focus-mode" : "review-focus-mode"}
    >
      <button type="button" onClick={() => onGrade("good")}>
        Grade good
      </button>
      <button type="button" onClick={onEditFlashcard}>
        Edit card
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

const getFlashcardReviewStateMock = vi.mocked(fetchFlashcardReviewState);
const getExamFlashcardsMock = vi.mocked(fetchExamFlashcards);
const reviewFlashcardMock = vi.mocked(reviewFlashcard);
const undoFlashcardReviewMock = vi.mocked(undoFlashcardReview);

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

  it("keeps the review session and shows a toast when grading throws", async () => {
    const card = makeCard("card-1");
    reviewFlashcardMock.mockRejectedValue(new Error("network down"));

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

    expect(toast.error).toHaveBeenCalledWith(
      "Could not save the review. Please try again.",
    );
    expect(
      document.body.querySelector('[data-current-card-id="card-1"]'),
    ).toBeTruthy();
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

  function clickButton(label: string) {
    Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent === label)
      ?.click();
  }

  async function startReview() {
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="flashcard-review-start-button"]',
        )
        ?.click();
    });
  }

  it("reports once when refilling the review queue keeps failing", async () => {
    getFlashcardReviewStateMock.mockRejectedValue(new TypeError("offline"));
    reviewFlashcardMock.mockResolvedValue({
      success: true,
      reviewedCardId: "card-1",
      reviewLogId: "review-log-1",
      flashcard: {
        ...makeCard("card-1"),
        state: "review",
        dueAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });
    await renderReviewClient(
      makeReviewState(3, [makeCard("card-1")]),
      "deck-1",
    );
    await startReview();

    await act(async () => {
      clickButton("Grade good");
    });

    await vi.waitFor(() => {
      expect(getFlashcardReviewStateMock).toHaveBeenCalledTimes(4);
      expect(toast.error).toHaveBeenCalledWith(
        "Could not load more cards. Please try again.",
      );
    });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("drops a card moved out of scope when the refresh after editing fails", async () => {
    getFlashcardReviewStateMock.mockRejectedValue(new TypeError("offline"));
    await renderReviewClient(
      makeReviewState(2, [makeCard("card-1"), makeCard("card-2")]),
      "deck-1",
    );
    await startReview();

    await act(async () => {
      clickButton("Edit card");
    });
    await act(async () => {
      clickButton("Save moved card");
    });

    await vi.waitFor(() => {
      expect(
        document.body.querySelector('[data-current-card-id="card-2"]'),
      ).toBeTruthy();
    });
  });

  function makeReviewCard(id: string): FlashcardReviewEntity {
    return {
      ...makeCard(id),
      state: "review",
      stability: "10.0000",
      difficulty: "5.0000",
      intervalDays: 10,
      lastReviewedAt: new Date("2026-02-25T11:00:00.000Z"),
      reviewCount: 3,
    };
  }

  function currentCardId(): string | undefined {
    return (
      document.body
        .querySelector("[data-current-card-id]")
        ?.getAttribute("data-current-card-id") ?? undefined
    );
  }

  it("shows the next card before the grade is saved and offers undo once it is", async () => {
    const save = createDeferred<Awaited<ReturnType<typeof reviewFlashcard>>>();
    reviewFlashcardMock.mockReturnValue(save.promise);
    await renderReviewClient(
      makeReviewState(2, [makeReviewCard("card-1"), makeReviewCard("card-2")]),
    );
    await startReview();

    await act(async () => {
      clickButton("Grade good");
    });

    expect(currentCardId()).toBe("card-2");
    expect(document.body.textContent).not.toContain("Undo last review");

    await act(async () => {
      save.resolve({
        success: true,
        reviewedCardId: "card-1",
        reviewLogId: "review-log-1",
        flashcard: {
          ...makeReviewCard("card-1"),
          dueAt: new Date("2099-01-01T00:00:00.000Z"),
          reviewCount: 4,
        },
      });
      await save.promise;
    });

    expect(currentCardId()).toBe("card-2");
    expect(document.body.textContent).toContain("Undo last review");
  });

  it("undoes the last review on u once the grade is saved", async () => {
    reviewFlashcardMock.mockResolvedValue({
      success: true,
      reviewedCardId: "card-1",
      reviewLogId: "review-log-1",
      flashcard: {
        ...makeReviewCard("card-1"),
        dueAt: new Date("2099-01-01T00:00:00.000Z"),
        reviewCount: 4,
      },
    });
    undoFlashcardReviewMock.mockResolvedValue({
      success: true,
      flashcard: makeReviewCard("card-1"),
    });
    await renderReviewClient(
      makeReviewState(2, [makeReviewCard("card-1"), makeReviewCard("card-2")]),
    );
    await startReview();

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "u" }));
    });
    expect(undoFlashcardReviewMock).not.toHaveBeenCalled();

    await act(async () => {
      clickButton("Grade good");
    });
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Undo last review");
    });
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "u" }));
    });

    expect(undoFlashcardReviewMock).toHaveBeenCalledWith({
      id: "card-1",
      reviewLogId: "review-log-1",
    });
  });

  it("puts the card back in front with a toast when the grade save fails", async () => {
    reviewFlashcardMock.mockResolvedValue({
      success: false,
      errorCode: "flashcards.review.unavailable",
    });
    await renderReviewClient(
      makeReviewState(2, [makeReviewCard("card-1"), makeReviewCard("card-2")]),
    );
    await startReview();

    await act(async () => {
      clickButton("Grade good");
    });

    await vi.waitFor(() => {
      expect(currentCardId()).toBe("card-1");
    });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("does not bring back a graded card from a refill fetched before its save landed", async () => {
    const save = createDeferred<Awaited<ReturnType<typeof reviewFlashcard>>>();
    reviewFlashcardMock.mockReturnValue(save.promise);
    getFlashcardReviewStateMock.mockResolvedValue(
      makeReviewState(2, [makeReviewCard("card-1"), makeReviewCard("card-2")]),
    );
    await renderReviewClient(makeReviewState(2, [makeReviewCard("card-1")]));
    await startReview();

    await act(async () => {
      clickButton("Grade good");
    });

    await vi.waitFor(() => {
      expect(getFlashcardReviewStateMock).toHaveBeenCalledTimes(1);
      expect(currentCardId()).toBe("card-2");
    });
  });

  function isLoadingMoreCards(): boolean {
    return (
      document.body
        .querySelector("[data-loading-more-cards]")
        ?.getAttribute("data-loading-more-cards") === "true"
    );
  }

  function dispatchBeforeUnload(): Event {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event;
  }

  it("asks before leaving the page while a grade is still saving", async () => {
    const save = createDeferred<Awaited<ReturnType<typeof reviewFlashcard>>>();
    reviewFlashcardMock.mockReturnValue(save.promise);
    await renderReviewClient(
      makeReviewState(2, [makeReviewCard("card-1"), makeReviewCard("card-2")]),
    );
    await startReview();

    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);

    await act(async () => {
      clickButton("Grade good");
    });

    expect(dispatchBeforeUnload().defaultPrevented).toBe(true);

    await act(async () => {
      save.resolve({
        success: true,
        reviewedCardId: "card-1",
        reviewLogId: "review-log-1",
        flashcard: makeReviewCard("card-1"),
      });
      await save.promise;
    });

    expect(dispatchBeforeUnload().defaultPrevented).toBe(false);
  });

  it("shows a loading state instead of caught up while more due cards are loading", async () => {
    const refill = createDeferred<FlashcardReviewState>();
    reviewFlashcardMock.mockResolvedValue({
      success: true,
      reviewedCardId: "card-1",
      reviewLogId: "review-log-1",
      flashcard: {
        ...makeReviewCard("card-1"),
        dueAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });
    getFlashcardReviewStateMock.mockReturnValue(refill.promise);
    await renderReviewClient(makeReviewState(2, [makeReviewCard("card-1")]));
    await startReview();

    await act(async () => {
      clickButton("Grade good");
    });

    expect(currentCardId()).toBeUndefined();
    expect(isLoadingMoreCards()).toBe(true);

    await act(async () => {
      refill.resolve(makeReviewState(1, [makeReviewCard("card-2")]));
      await refill.promise;
    });

    expect(currentCardId()).toBe("card-2");
    expect(isLoadingMoreCards()).toBe(false);
  });

  it("loads the remaining due cards once queued grades finish saving", async () => {
    const save = createDeferred<Awaited<ReturnType<typeof reviewFlashcard>>>();
    reviewFlashcardMock.mockReturnValue(save.promise);
    // Before the save lands the server still lists card-1 first; afterwards
    // the batch moves on to card-2.
    let saveLanded = false;
    getFlashcardReviewStateMock.mockImplementation(async () =>
      saveLanded
        ? makeReviewState(1, [makeReviewCard("card-2")])
        : makeReviewState(2, [makeReviewCard("card-1")]),
    );
    await renderReviewClient(makeReviewState(2, [makeReviewCard("card-1")]));
    await startReview();

    await act(async () => {
      clickButton("Grade good");
    });

    expect(currentCardId()).toBeUndefined();
    expect(isLoadingMoreCards()).toBe(true);

    await act(async () => {
      saveLanded = true;
      save.resolve({
        success: true,
        reviewedCardId: "card-1",
        reviewLogId: "review-log-1",
        flashcard: {
          ...makeReviewCard("card-1"),
          dueAt: new Date("2099-01-01T00:00:00.000Z"),
        },
      });
      await save.promise;
    });

    await vi.waitFor(() => {
      expect(currentCardId()).toBe("card-2");
    });
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
