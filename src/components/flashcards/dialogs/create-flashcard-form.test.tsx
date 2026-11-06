import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateFlashcardForm } from "@/components/flashcards/dialogs/create-flashcard-form";
import type { FlashcardFormValues } from "@/features/flashcards/validation";
import type { FolderOption } from "@/lib/server/api-contracts";
import { testDocument } from "@/test/document";

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
  folders = [],
  onCreateFolder,
  isDuplicate = false,
}: Readonly<{
  isDuplicate?: boolean;
  folders?: FolderOption[];
  onCreateFolder?: (name: string) => Promise<boolean>;
}>) {
  const form = useForm<FlashcardFormValues>({
    defaultValues: {
      folderId: "",
      front: testDocument(""),
      back: testDocument(""),
    },
  });

  return (
    <CreateFlashcardForm
      open
      form={form}
      formId="form-create-flashcard"
      folders={folders}
      onCreateFolder={onCreateFolder}
      onSubmit={async () => {}}
      isSubmitting={false}
      duplicateFrontMessage={
        isDuplicate ? "A flashcard with this front already exists." : null
      }
      keepOptions={{
        keepFrontAfterSubmit: false,
        onKeepFrontAfterSubmitChange: () => {},
        keepBackAfterSubmit: false,
        onKeepBackAfterSubmitChange: () => {},
      }}
    />
  );
}

function getFolderOption(name: string): FolderOption {
  const now = new Date();
  return {
    id: name.toLowerCase(),
    name,
    path: name,
    parentFolderId: null,
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

describe("CreateFlashcardForm", () => {
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

  it("shows a save-time duplicate error inline while allowing a retry", async () => {
    await act(async () => root.render(<Harness isDuplicate />));
    expect(container.textContent).toContain(
      "A flashcard with this front already exists.",
    );
    const button = container.querySelector(
      'button[form="form-create-flashcard"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
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
      root.render(<Harness folders={[]} />);
    });

    const deckSelect = container.querySelector(
      "#form-create-flashcard-folder",
    ) as HTMLButtonElement;

    expect(deckSelect).not.toBeNull();
    expect(deckSelect.disabled).toBe(true);
    expect(deckSelect.textContent).toContain("Select a folder");
  });

  it("creates a folder from the filtered create row", async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(true);
    await act(async () => {
      root.render(
        <Harness
          folders={[getFolderOption("CS")]}
          onCreateFolder={onCreateFolder}
        />,
      );
    });

    const folderSelect = container.querySelector(
      "#form-create-flashcard-folder",
    ) as HTMLButtonElement;
    expect(folderSelect.disabled).toBe(false);

    await act(async () => {
      folderSelect.click();
    });

    const searchInput = document.body.querySelector(
      'input[placeholder="Search folders by path"]',
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

    expect(onCreateFolder).toHaveBeenCalledWith("Biology");
  });
});
