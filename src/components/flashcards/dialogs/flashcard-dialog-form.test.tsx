import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardDialogForm } from "@/components/flashcards/dialogs/flashcard-dialog-form";
import type { CreateFlashcardForm } from "@/features/flashcards/validation";
import type { DeckEntity } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const editorCallbacks = new Map<string, (pending: boolean) => void>();

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

function Harness({
  decks = [],
}: Readonly<{ decks?: DeckEntity[] | undefined }>) {
  const form = useForm<CreateFlashcardForm>({
    defaultValues: {
      deckId: "",
      front: "",
      back: "",
    },
  });

  return (
    <FlashcardDialogForm
      mode="create"
      open
      onOpenChange={() => {}}
      form={form}
      formId="form-create-flashcard"
      decks={decks}
      onSubmit={async () => {}}
      isSubmitting={false}
      discard={{
        open: true,
        onOpenChange: () => {},
        onDiscard: () => {},
      }}
      aiBack={{
        isGenerating: false,
        canUse: true,
        onGenerate: async () => {},
        previousValue: null,
        proposedValue: null,
        onAccept: () => {},
        onReject: () => {},
      }}
      aiEnabled
      duplicateFront={{
        isChecking: false,
        isDuplicate: false,
        message: "",
      }}
      createOptions={{
        keepFrontAfterSubmit: false,
        onKeepFrontAfterSubmitChange: () => {},
        keepBackAfterSubmit: false,
        onKeepBackAfterSubmitChange: () => {},
      }}
      noDialog
    />
  );
}

describe("FlashcardDialogForm", () => {
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

  it("disables submit while either editor is uploading an image", async () => {
    await act(async () => {
      root.render(<Harness />);
    });

    const button = container.querySelector(
      'button[form="form-create-flashcard"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);

    await act(async () => {
      editorCallbacks.get("form-create-flashcard-front")?.(true);
    });

    expect(button.disabled).toBe(true);

    await act(async () => {
      editorCallbacks.get("form-create-flashcard-back")?.(true);
      editorCallbacks.get("form-create-flashcard-front")?.(false);
    });

    expect(button.disabled).toBe(true);

    await act(async () => {
      editorCallbacks.get("form-create-flashcard-back")?.(false);
    });

    expect(button.disabled).toBe(false);
  });

  it("does not render discard confirmation in embedded form mode", async () => {
    await act(async () => {
      root.render(<Harness />);
    });

    expect(document.body.textContent).not.toContain("Discard changes?");
  });

  it("renders the deck selector while decks are still loading", async () => {
    await act(async () => {
      root.render(<Harness decks={[]} />);
    });

    const deckSelect = container.querySelector(
      "#form-create-flashcard-deck",
    ) as HTMLButtonElement;

    expect(deckSelect).not.toBeNull();
    expect(deckSelect.disabled).toBe(true);
    expect(deckSelect.textContent).toContain("Select a deck");
  });
});
