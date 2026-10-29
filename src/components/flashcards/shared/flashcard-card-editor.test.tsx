import { act, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardCardEditor } from "@/components/flashcards/shared/flashcard-card-editor";
import type { EditorToolbarTarget } from "@/components/shared/tiptap-editor";
import type { FlashcardFormValues } from "@/features/flashcards/validation";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

interface FakeEditorProps {
  id: string;
  onFocus?: () => void;
  onToolbarTargetChange?: (target: EditorToolbarTarget | null) => void;
}

// Reports a toolbar target named after the field, like the real editor does
// once Tiptap is ready, and exposes a button that focuses the field.
function FakeEditor({ id, onFocus, onToolbarTargetChange }: FakeEditorProps) {
  const reportRef = useRef(onToolbarTargetChange);
  reportRef.current = onToolbarTargetChange;
  useEffect(() => {
    const report = reportRef.current;
    report?.({
      editor: { id } as unknown as EditorToolbarTarget["editor"],
      imageUploadPending: false,
      onEditLink: () => {},
      onSelectImage: () => {},
    });
    return () => report?.(null);
  }, [id]);
  return (
    <button type="button" onClick={onFocus}>
      focus {id}
    </button>
  );
}

vi.mock("@/components/shared/lazy-tiptap-editor", () => ({
  LazyTiptapEditor: (props: FakeEditorProps) => <FakeEditor {...props} />,
}));

vi.mock("@/components/shared/tiptap-formatting-toolbar", () => ({
  EDITOR_ROOT_ATTRIBUTE: "data-tiptap-editor-root",
  TiptapFormattingToolbar: ({ editor }: { editor: { id: string } }) => (
    <div role="toolbar" data-editor={editor.id} />
  ),
}));

function Harness() {
  const form = useForm<FlashcardFormValues>({
    defaultValues: { subjectId: "", front: "", back: "" },
  });
  return (
    <FlashcardCardEditor
      form={form}
      idPrefix="card"
      review={{ pending: null, decide: undefined, blocked: false }}
      reviewDisabled={false}
      onImageUploadPendingChange={() => {}}
    />
  );
}

describe("FlashcardCardEditor", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  function toolbars() {
    return container.querySelectorAll('[role="toolbar"]');
  }

  function clickButton(label: string) {
    Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === label)
      ?.click();
  }

  it("shows one toolbar for both faces, starting on the front", async () => {
    await act(async () => root.render(<Harness />));

    expect(toolbars()).toHaveLength(1);
    expect(toolbars()[0]?.getAttribute("data-editor")).toBe("card-front");
  });

  it("moves the toolbar to the face that takes focus", async () => {
    await act(async () => root.render(<Harness />));

    await act(async () => clickButton("focus card-back"));
    expect(toolbars()[0]?.getAttribute("data-editor")).toBe("card-back");

    await act(async () => clickButton("focus card-front"));
    expect(toolbars()[0]?.getAttribute("data-editor")).toBe("card-front");
  });
});
