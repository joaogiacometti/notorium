import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardDialogForm } from "@/components/flashcards/dialogs/flashcard-dialog-form";
import type { FlashcardFormValues } from "@/features/flashcards/validation";
import type { SubjectOption } from "@/lib/server/api-contracts";

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
  subjects = [],
  onCreateSubject,
}: Readonly<{
  subjects?: SubjectOption[] | undefined;
  onCreateSubject?: (name: string) => Promise<boolean>;
}>) {
  const form = useForm<FlashcardFormValues>({
    defaultValues: {
      type: "basic",
      subjectId: "",
      front: "",
      back: "",
      clozeSource: "",
    },
  });

  return (
    <FlashcardDialogForm
      mode="create"
      open
      onOpenChange={() => {}}
      form={form}
      formId="form-create-flashcard"
      subjects={subjects}
      onCreateSubject={onCreateSubject}
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

function getSubjectOption(name: string): SubjectOption {
  const now = new Date();
  return {
    id: name.toLowerCase(),
    name,
    path: name,
    kind: "academic",
    parentSubjectId: null,
    totalClasses: null,
    maxMisses: null,
    userId: "user-1",
    createdAt: now,
    updatedAt: now,
  };
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
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
      root.render(<Harness subjects={[]} />);
    });

    const deckSelect = container.querySelector(
      "#form-create-flashcard-subject",
    ) as HTMLButtonElement;

    expect(deckSelect).not.toBeNull();
    expect(deckSelect.disabled).toBe(true);
    expect(deckSelect.textContent).toContain("Select a subject");
  });

  it("creates a subject from the filtered create row", async () => {
    const onCreateSubject = vi.fn().mockResolvedValue(true);
    await act(async () => {
      root.render(
        <Harness
          subjects={[getSubjectOption("CS")]}
          onCreateSubject={onCreateSubject}
        />,
      );
    });

    const subjectSelect = container.querySelector(
      "#form-create-flashcard-subject",
    ) as HTMLButtonElement;
    expect(subjectSelect.disabled).toBe(false);

    await act(async () => {
      subjectSelect.click();
    });

    const searchInput = document.body.querySelector(
      'input[placeholder="Search subjects by path"]',
    ) as HTMLInputElement;
    await act(async () => {
      setInputValue(searchInput, "Biology");
    });

    const createItem = Array.from(
      document.body.querySelectorAll('[data-slot="command-item"]'),
    ).find((item) => item.textContent?.includes("Create Biology"));
    expect(createItem).toBeDefined();

    await act(async () => {
      (createItem as HTMLElement).click();
    });

    expect(onCreateSubject).toHaveBeenCalledWith("Biology");
  });
});
