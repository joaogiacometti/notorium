import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoteDialogForm } from "@/components/notes/note-dialog-form";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const editorCallbacks = new Map<string, (pending: boolean) => void>();
const editorValues = new Map<string, string>();

vi.mock("@/components/shared/lazy-tiptap-editor", () => ({
  LazyTiptapEditor: ({
    id,
    value,
    onImageUploadPendingChange,
  }: {
    id?: string;
    value?: string;
    onImageUploadPendingChange?: (pending: boolean) => void;
  }) => {
    if (id) {
      editorCallbacks.set(id, onImageUploadPendingChange ?? (() => {}));
      editorValues.set(id, value ?? "");
    }

    return <div data-testid={id} />;
  },
}));

vi.mock("@/components/shared/editor-attachment-cleanup", () => ({
  cleanupDiscardedEditorAttachments: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/editor/use-before-unload", () => ({
  useBeforeUnload: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("NoteDialogForm", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    editorCallbacks.clear();
    editorValues.clear();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    queryClient.clear();
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("disables submit while a pasted image upload is pending", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <NoteDialogForm
            mode="create"
            open
            onOpenChange={() => {}}
            values={{ subjectId: "subject-1", title: "", content: "" }}
            onSubmitAction={async () => ({ success: true })}
          />
        </QueryClientProvider>,
      );
    });

    const button = document.body.querySelector(
      'button[form="form-create-note"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain("Create Note");

    await act(async () => {
      editorCallbacks.get("form-create-note-content")?.(true);
    });

    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("Uploading image...");

    await act(async () => {
      editorCallbacks.get("form-create-note-content")?.(false);
    });

    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain("Create Note");
  });

  it("preserves edit-mode content while upload pending state changes", async () => {
    const existingContent = "<p>Legacy note content</p>";

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <NoteDialogForm
            mode="edit"
            open
            onOpenChange={() => {}}
            values={{ id: "note-1", title: "Aula 2", content: existingContent }}
            onSubmitAction={async () => ({ success: true })}
          />
        </QueryClientProvider>,
      );
    });

    expect(editorValues.get("form-edit-note-content")).toBe(existingContent);

    await act(async () => {
      editorCallbacks.get("form-edit-note-content")?.(true);
    });

    expect(editorValues.get("form-edit-note-content")).toBe(existingContent);

    await act(async () => {
      editorCallbacks.get("form-edit-note-content")?.(false);
    });

    expect(editorValues.get("form-edit-note-content")).toBe(existingContent);
  });
});
