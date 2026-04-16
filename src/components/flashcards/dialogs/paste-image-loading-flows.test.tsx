import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateFlashcardDialog } from "@/components/flashcards/dialogs/create-flashcard-dialog";
import { EditFlashcardDialog } from "@/components/flashcards/dialogs/edit-flashcard-dialog";
import { GenerateFlashcardsReview } from "@/components/flashcards/dialogs/generate-flashcards-review";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const editorCallbacks = new Map<string, (pending: boolean) => void>();

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/app/actions/decks", () => ({
  getDecks: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/app/actions/flashcards", () => ({
  createFlashcard: vi.fn(),
  deleteFlashcard: vi.fn(),
  editFlashcard: vi.fn(),
  generateFlashcards: vi.fn(),
}));

vi.mock("@/features/attachments/client-cleanup", () => ({
  cleanupDiscardedEditorAttachments: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/editor/use-before-unload", () => ({
  useBeforeUnload: vi.fn(),
}));

vi.mock("@/components/shared/lazy-tiptap-editor", () => ({
  LazyTiptapEditor: ({
    id,
    onImageUploadPendingChange,
  }: {
    id?: string;
    onImageUploadPendingChange?: (pending: boolean) => void;
  }) => {
    if (id) {
      editorCallbacks.set(id, onImageUploadPendingChange ?? (() => {}));
    }

    return <div data-testid={id} />;
  },
}));

vi.mock("@/components/flashcards/dialogs/use-flashcard-dialog-state", () => ({
  useFlashcardDialogState: () => ({
    handleOpenChange: vi.fn(),
    handleSubmit: vi.fn(),
    isSubmitting: false,
    discardDialogOpen: false,
    setDiscardDialogOpen: vi.fn(),
    handleDiscardChanges: vi.fn(),
    isGeneratingBack: false,
    canUseAiBack: true,
    handleGenerateBack: vi.fn(),
    previousBack: null,
    proposedBack: null,
    handleAcceptBack: vi.fn(),
    handleRejectBack: vi.fn(),
    isCheckingDuplicateFront: false,
    isDuplicateFront: false,
    duplicateFrontMessage: "",
  }),
}));

vi.mock("@/components/flashcards/dialogs/flashcard-dialog-form", () => ({
  FlashcardDialogForm: ({
    mode,
    typeToggle,
  }: {
    mode: "create" | "edit";
    typeToggle?: { onModeChange: (mode: string) => void };
  }) => (
    <button
      type="button"
      data-testid="toggle-mode"
      onClick={() =>
        typeToggle?.onModeChange(mode === "create" ? "ai" : "split")
      }
    >
      Toggle
    </button>
  ),
}));

function GenerateFlashcardsReviewHarness() {
  return (
    <GenerateFlashcardsReview
      cards={[{ front: "<p>Front</p>", back: "<p>Back</p>" }]}
      onCreate={async () => 1}
      isCreating={false}
    />
  );
}

const flashcard = {
  id: "flashcard-1",
  deckId: "deck-1",
  front: "<p>Front</p>",
  frontNormalized: "front",
  back: "<p>Back</p>",
  state: "new",
  dueAt: new Date("2026-04-13T00:00:00.000Z"),
  stability: null,
  difficulty: null,
  ease: 250,
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
    editorCallbacks.clear();
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

  it("disables AI generation in create dialog while resources editor uploads an image", async () => {
    await act(async () => {
      root.render(<CreateFlashcardDialog open onOpenChange={() => {}} />);
    });

    await act(async () => {
      (
        document.body.querySelector(
          '[data-testid="toggle-mode"]',
        ) as HTMLButtonElement
      ).click();
    });

    const button = Array.from(document.body.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Generate Flashcards"),
    ) as HTMLButtonElement;

    await act(async () => {
      editorCallbacks.get("ai-text")?.(true);
    });

    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("Uploading image...");
  });

  it("disables split action in edit dialog while either split editor uploads an image", async () => {
    await act(async () => {
      root.render(
        <EditFlashcardDialog
          open
          onOpenChange={() => {}}
          flashcard={flashcard}
        />,
      );
    });

    await act(async () => {
      (
        document.body.querySelector(
          '[data-testid="toggle-mode"]',
        ) as HTMLButtonElement
      ).click();
    });

    const button = Array.from(document.body.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Split Flashcard"),
    ) as HTMLButtonElement;

    await act(async () => {
      editorCallbacks.get("split-front")?.(true);
    });

    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("Uploading image...");
  });

  it("disables review edit save and create while an edited card image upload is pending", async () => {
    await act(async () => {
      root.render(<GenerateFlashcardsReviewHarness />);
    });

    const editButton = Array.from(container.querySelectorAll("button")).find(
      (item) => item.getAttribute("aria-label") === "Edit card 1",
    ) as HTMLButtonElement;

    await act(async () => {
      editButton.click();
    });

    const saveButton = Array.from(container.querySelectorAll("button")).find(
      (item) => item.textContent === "Save",
    ) as HTMLButtonElement;
    const createButton = Array.from(container.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Create 1 Card"),
    ) as HTMLButtonElement;

    await act(async () => {
      editorCallbacks.get("edit-front-0")?.(true);
    });

    expect(saveButton.disabled).toBe(true);
    expect(createButton.disabled).toBe(true);
    expect(createButton.textContent).toContain("Uploading image...");
  });
});
