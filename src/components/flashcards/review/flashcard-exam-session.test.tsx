import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setFlashcardStudyLater } from "@/app/actions/flashcards";
import { FlashcardExamSession } from "@/components/flashcards/review/flashcard-exam-session";
import { makeCard } from "@/components/flashcards/review/flashcard-review-client-test-support";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

// Records navigation in place of the Next.js App Router.
class FakeAppRouter {
  pushedHrefs: string[] = [];
  push = (href: string): void => {
    this.pushedHrefs.push(href);
  };
}

const appRouterStandIn = vi.hoisted(() => ({
  current: null as null | FakeAppRouter,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => appRouterStandIn.current,
}));

vi.mock("@/app/actions/flashcards", () => ({
  setFlashcardStudyLater: vi.fn(),
}));

vi.mock("@/components/flashcards/dialogs/delete-flashcard-dialog", () => ({
  DeleteFlashcardDialog: () => null,
}));
vi.mock("@/components/flashcards/dialogs/reset-flashcard-dialog", () => ({
  ResetFlashcardDialog: () => null,
}));
vi.mock("@/components/flashcards/dialogs/lazy-edit-flashcard-dialog", () => ({
  LazyEditFlashcardDialog: () => null,
}));
vi.mock("@/components/shortcuts/shortcuts-suspension-context", () => ({
  useShortcutsDialogOpen: () => false,
}));

vi.mock("@/components/flashcards/review/exam-results-screen", () => ({
  ExamResultsScreen: ({
    totalCards,
    onClose,
  }: {
    totalCards: number;
    onClose: () => void;
  }) => (
    <div data-testid="exam-results">
      <span>{totalCards} cards</span>
      <button type="button" onClick={onClose}>
        Close results
      </button>
    </div>
  ),
}));

vi.mock("@/components/flashcards/review/review-session-screen", () => ({
  ReviewSessionScreen: ({
    currentCard,
    headerText,
    onGrade,
    onExit,
    onToggleStudyLater,
  }: {
    currentCard: { id: string; studyLaterAt: Date | null } | null;
    headerText: string;
    onGrade: (grade: "good" | "again") => void;
    onExit: () => void;
    onToggleStudyLater: () => void;
  }) => (
    <div
      data-card-id={currentCard?.id}
      data-study-later={String(Boolean(currentCard?.studyLaterAt))}
      data-testid="exam-session"
    >
      <span>{headerText}</span>
      <button type="button" onClick={onToggleStudyLater}>
        Study later
      </button>
      <button type="button" onClick={() => onGrade("good")}>
        Grade good
      </button>
      <button type="button" onClick={() => onGrade("again")}>
        Grade again
      </button>
      <button type="button" onClick={onExit}>
        Exit exam
      </button>
    </div>
  ),
}));

vi.mock("@/components/flashcards/review/exam-exit-confirmation-dialog", () => ({
  ExamExitConfirmationDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => void;
  }) =>
    open ? (
      <button type="button" onClick={onConfirm}>
        Confirm exit
      </button>
    ) : null,
}));

describe("FlashcardExamSession", () => {
  let container: HTMLDivElement;
  let root: Root;
  let router: FakeAppRouter;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    router = new FakeAppRouter();
    appRouterStandIn.current = router;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  function clickButton(label: string) {
    Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent === label)
      ?.click();
  }

  async function renderExam(subjectId?: string) {
    await act(async () => {
      root.render(
        <FlashcardExamSession
          initialCards={[makeCard("card-1"), makeCard("card-2")]}
          subjects={[]}
          subjectId={subjectId}
          aiEnabled={false}
        />,
      );
    });
  }

  it("starts on the first card of the given order", async () => {
    await renderExam();

    expect(container.textContent).toContain("Card 1 of 2");
    expect(
      container.querySelector("[data-card-id]")?.getAttribute("data-card-id"),
    ).toBe("card-1");
  });

  it("leaves without confirmation before any card is rated", async () => {
    await renderExam("deck-1");

    await act(async () => clickButton("Exit exam"));

    expect(router.pushedHrefs).toEqual([
      "/flashcards?view=review&subjectId=deck-1",
    ]);
  });

  it("asks for confirmation when exiting mid-exam", async () => {
    await renderExam();

    await act(async () => clickButton("Grade good"));
    await act(async () => clickButton("Exit exam"));

    expect(router.pushedHrefs).toEqual([]);

    await act(async () => clickButton("Confirm exit"));

    expect(router.pushedHrefs).toEqual(["/flashcards?view=review"]);
  });

  it("saves study later without moving off the current card", async () => {
    vi.mocked(setFlashcardStudyLater).mockResolvedValue({
      success: true,
      studyLaterAt: new Date("2026-10-30T10:00:00.000Z"),
    });
    await renderExam();

    await act(async () => clickButton("Study later"));

    const session = container.querySelector("[data-card-id]");
    expect(setFlashcardStudyLater).toHaveBeenCalledWith({
      id: "card-1",
      studyLater: true,
    });
    expect(session?.getAttribute("data-card-id")).toBe("card-1");
    expect(session?.getAttribute("data-study-later")).toBe("true");
    expect(container.textContent).toContain("Card 1 of 2");
  });

  it("shows results after the last card and closes back to the hub", async () => {
    await renderExam();

    await act(async () => clickButton("Grade good"));
    await act(async () => clickButton("Grade again"));

    expect(container.textContent).toContain("2 cards");

    await act(async () => clickButton("Close results"));

    expect(router.pushedHrefs).toEqual(["/flashcards?view=review"]);
  });
});
