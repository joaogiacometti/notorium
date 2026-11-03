import type { Editor } from "@tiptap/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { TiptapEditor } from "@/components/shared/tiptap-editor";
import {
  documentFromJSON,
  type RichTextDocument,
  richTextDocumentSchema,
} from "@/lib/editor/document";
import { testDocument } from "@/test/document";

it("edits and receives native JSON without resetting the selection on a form echo", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let editor: Editor | null = null;
  const updates: RichTextDocument[] = [];
  const onReady = (ready: Editor | null) => {
    editor = ready;
  };
  const onChange = (value: RichTextDocument) => {
    updates.push(value);
  };
  const initial = testDocument("<p>Initial</p>");
  try {
    await act(async () =>
      root.render(
        <TiptapEditor
          value={initial}
          onChange={onChange}
          onEditorReady={onReady}
        />,
      ),
    );
    const active = editor as Editor | null;
    expect(active).not.toBeNull();
    if (!active) return;
    await act(async () => {
      active.chain().setTextSelection(4).insertContent("typed ").run();
    });
    const update = updates.at(-1);
    expect(richTextDocumentSchema.safeParse(update).success).toBe(true);
    expect(update).toEqual(documentFromJSON(active.getJSON()));
    const selection = active.state.selection.from;
    if (!update) return;
    await act(async () =>
      root.render(
        <TiptapEditor
          value={structuredClone(update)}
          onChange={onChange}
          onEditorReady={onReady}
        />,
      ),
    );
    expect(active.state.selection.from).toBe(selection);
    const external = testDocument("<p><strong>External</strong></p>");
    await act(async () =>
      root.render(
        <TiptapEditor
          value={external}
          onChange={onChange}
          onEditorReady={onReady}
        />,
      ),
    );
    expect(active.getText()).toBe("External");
    expect(documentFromJSON(active.getJSON())).toEqual(external);
    await act(async () => {
      active.commands.insertContent({
        type: "noteLink",
        attrs: { noteId: "n1", label: "Target note" },
      });
    });
    const bodyUpdates = updates.length;
    await act(async () => {
      active.view.dispatch(
        active.state.tr.setDocAttribute("documentTitle", "Renamed"),
      );
    });
    expect(updates).toHaveLength(bodyUpdates);
    const linked = documentFromJSON(active.getJSON());
    expect(
      richTextDocumentSchema.safeParse(linked).success,
      JSON.stringify(linked),
    ).toBe(true);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
