import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateFlashcardDialog } from "@/components/flashcards/dialogs/create-flashcard-dialog";
import { EditFlashcardDialog } from "@/components/flashcards/dialogs/edit-flashcard-dialog";
import { fetchSubjectOptions } from "@/lib/read-api/subjects";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const flashcardDialogState = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/read-api/subjects", () => ({
  fetchSubjectOptions: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/app/actions/flashcards", () => ({
  createFlashcard: vi.fn(),
  deleteFlashcard: vi.fn(),
  editFlashcard: vi.fn(),
}));

vi.mock("@/components/flashcards/dialogs/use-flashcard-dialog-state", () => ({
  useFlashcardDialogState: () => flashcardDialogState.current,
}));

vi.mock("@/components/flashcards/dialogs/flashcard-dialog-form", () => ({
  FlashcardDialogForm: () => null,
}));

const flashcard = {
  id: "flashcard-1",
  subjectId: "deck-1",
  front: "<p>Front</p>",
  frontNormalized: "front",
  back: "<p>Back</p>",
  state: "new",
  dueAt: new Date("2026-04-13T00:00:00.000Z"),
  stability: null,
  difficulty: null,
  intervalDays: 0,
  learningStep: null,
  lastReviewedAt: null,
  reviewCount: 0,
  lapseCount: 0,
  userId: "user-1",
  createdAt: new Date("2026-04-13T00:00:00.000Z"),
  updatedAt: new Date("2026-04-13T00:00:00.000Z"),
};

describe("paste-image loading flows", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    flashcardDialogState.current = {
      handleOpenChange: vi.fn(),
      handleSubmit: vi.fn(),
      isSubmitting: false,
      discardDialogOpen: false,
      setDiscardDialogOpen: vi.fn(),
      handleDiscardChanges: vi.fn(),
      isDuplicateFront: false,
      duplicateFrontMessage: "",
    };
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
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("renders create discard confirmation outside the embedded form", async () => {
    flashcardDialogState.current.discardDialogOpen = true;
    const queryClient = new QueryClient();

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CreateFlashcardDialog open onOpenChange={() => {}} aiEnabled />
        </QueryClientProvider>,
      );
    });

    expect(document.body.textContent).toContain("Discard changes?");
  });

  it("reports a failed subject load instead of leaving it unhandled", async () => {
    vi.mocked(fetchSubjectOptions).mockRejectedValueOnce(
      new Error("network down"),
    );

    await act(async () => {
      root.render(
        <EditFlashcardDialog
          open
          onOpenChange={() => {}}
          flashcard={flashcard}
          aiEnabled
        />,
      );
    });

    expect(toast.error).toHaveBeenCalledWith("Could not load subjects.");
  });

  it("renders edit discard confirmation outside the embedded form", async () => {
    flashcardDialogState.current.discardDialogOpen = true;

    await act(async () => {
      root.render(
        <EditFlashcardDialog
          open
          onOpenChange={() => {}}
          flashcard={flashcard}
          aiEnabled
        />,
      );
    });

    expect(document.body.textContent).toContain("Discard changes?");
  });
  it("links the edited card's source in a new tab so unsaved edits survive", async () => {
    await act(async () => {
      root.render(
        <EditFlashcardDialog
          open
          onOpenChange={() => {}}
          flashcard={{
            ...flashcard,
            source: { kind: "note", id: "n1", title: "Cells", subjectId: "s1" },
          }}
          aiEnabled
        />,
      );
    });

    const link = document.body.querySelector<HTMLAnchorElement>(
      'a[aria-label^="Source note"]',
    );
    expect(link?.getAttribute("href")).toBe("/subjects/s1/documents/notes/n1");
    expect(link?.target).toBe("_blank");
  });
});
