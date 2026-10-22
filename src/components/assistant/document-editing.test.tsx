import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { act, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AssistantDocumentProposal } from "@/components/assistant/assistant-document-proposal";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { useActiveNoteEditor } from "@/components/assistant/use-active-note-editor";
import { NoteDocumentReview } from "@/components/notes/note-document-review";
import type { EditNoteForm } from "@/features/notes/validation";
import { DocumentTitleHistory } from "@/lib/editor/document-title-history";
import { FakeDocumentEditChat } from "@/test/fake-document-edit-chat";
import "@/components/assistant/prepare-document-edit";

function NoteSurface({ editor }: { editor: Editor }) {
  const [blocked, setBlocked] = useState(false);
  const [id, setId] = useState("note");
  const form = useForm<EditNoteForm>({
    defaultValues: {
      id,
      title: "Original title",
      content: "<p>Original explanation</p><p>Preserved</p>",
    },
  });
  const values = form.watch();
  useEffect(() => {
    const update = () =>
      form.setValue("content", editor.getHTML(), { shouldDirty: true });
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor, form]);
  const review = useActiveNoteEditor({
    editor,
    form,
    title: values.title,
    id,
    blocked,
  });
  return (
    <>
      {review ? (
        <NoteDocumentReview proposal={review} disabled={false} />
      ) : null}
      <output data-testid="values">{JSON.stringify(values)}</output>
      <button
        type="button"
        onClick={() => editor.commands.setContent("<p>New typing</p>")}
      >
        Type
      </button>
      <button type="button" onClick={() => editor.commands.undo()}>
        Undo
      </button>
      <button type="button" onClick={() => editor.commands.redo()}>
        Redo
      </button>
      <button type="button" onClick={() => setBlocked(!blocked)}>
        Upload
      </button>
      <button type="button" onClick={() => setId("other")}>
        Navigate
      </button>
    </>
  );
}
function WorkspaceHarness({ editor }: { editor: Editor }) {
  const workspace = useAssistantWorkspace();
  const [mounted, setMounted] = useState(true);
  return (
    <>
      {mounted ? <NoteSurface editor={editor} /> : null}
      <button type="button" onClick={() => setMounted(false)}>
        Leave
      </button>
      <button
        type="button"
        onClick={() => void workspace?.send("Improve this note")}
      >
        Send
      </button>
      <button type="button" onClick={() => workspace?.reset()}>
        Reset
      </button>
      <output data-testid="notice">{workspace?.notice}</output>
      <output data-testid="messages">
        {JSON.stringify(workspace?.chat.messages)}
      </output>
      {workspace?.chat.messages.flatMap((message) =>
        message.parts.map((part) =>
          part.type === "tool-proposeNoteEdits" ||
          part.type === "tool-proposeMindmapEdits" ? (
            <AssistantDocumentProposal key={part.toolCallId} proposal={part} />
          ) : null,
        ),
      )}
    </>
  );
}

describe("document proposal lifecycle", () => {
  let root: Root;
  let container: HTMLDivElement;
  let editor: Editor;
  let transport: FakeDocumentEditChat;
  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    editor = new Editor({
      extensions: [StarterKit, DocumentTitleHistory],
      content: "<p>Original explanation</p><p>Preserved</p>",
    });
    root = createRoot(container);
    transport = new FakeDocumentEditChat();
    await act(async () =>
      root.render(
        <AssistantWorkspaceProvider transport={transport}>
          <WorkspaceHarness editor={editor} />
        </AssistantWorkspaceProvider>,
      ),
    );
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    editor.destroy();
    container.remove();
  });
  async function click(label: string) {
    const button = [...container.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === label,
    );
    expect(button, label).toBeDefined();
    await act(async () => button?.click());
  }
  const read = (id: string) =>
    container.querySelector(`[data-testid="${id}"]`)?.textContent ?? "";

  it("previews without mutating, applies once, and undoes title and content together", async () => {
    transport.title = "Improved title";
    await click("Send");
    expect(
      container.querySelector('[aria-label="Suggested note content changes"]'),
    ).not.toBeNull();
    expect(read("values")).toContain("Original explanation");
    await click("Accept changes");
    expect(read("values")).toContain("Improved explanation");
    expect(read("values")).toContain("Improved title");
    expect(read("values")).toContain("Preserved");
    expect(read("messages")).toContain('"outcome":"accepted"');
    await click("Undo");
    expect(read("values")).toContain("Original explanation");
    expect(read("values")).toContain("Original title");
    await click("Redo");
    expect(read("values")).toContain("Improved explanation");
    expect(read("values")).toContain("Improved title");
  });
  it("discards changes and records a result for the next turn", async () => {
    await click("Send");
    await click("Discard changes");
    await click("Send");
    expect(read("values")).toContain("Original explanation");
    expect(JSON.stringify(transport.requests[1].messages)).toContain(
      '"outcome":"discarded"',
    );
  });
  it("rejects proposals when typing occurs before apply", async () => {
    await click("Send");
    await click("Type");
    await click("Accept changes");
    expect(read("values")).toContain("New typing");
    expect(read("messages")).toContain('"outcome":"stale"');
  });
  it("rejects late proposals after typing or navigation", async () => {
    transport.delayed = true;
    await click("Send");
    await click("Type");
    await act(async () => transport.finishReply());
    expect(read("messages")).toContain('"outcome":"stale"');
    await click("Send");
    await click("Navigate");
    await act(async () => transport.finishReply());
    expect(container.textContent).not.toContain("Accept changes");
  });
  it("skips unresolved proposals before follow-ups and on leaving", async () => {
    await click("Send");
    await click("Send");
    expect(JSON.stringify(transport.requests[1].messages)).toContain(
      '"outcome":"skipped"',
    );
    await click("Leave");
    expect(read("messages").match(/"outcome":"skipped"/g)).toHaveLength(2);
  });
  it("settles multiple proposals without losing outcomes", async () => {
    transport.duplicate = true;
    await click("Send");
    expect(read("messages")).toContain('"outcome":"skipped"');
    expect(
      [...container.querySelectorAll("button")].filter(
        (button) => button.textContent === "Accept changes",
      ),
    ).toHaveLength(1);
    await click("Accept changes");
    expect(read("messages")).toContain('"outcome":"accepted"');
  });
  it("blocks apply during uploads without discarding the proposal", async () => {
    await click("Send");
    await click("Upload");
    await click("Accept changes");
    expect(read("values")).toContain("Original explanation");
    expect(read("notice")).toContain("uploads");
    await click("Upload");
    await click("Accept changes");
    expect(read("values")).toContain("Improved explanation");
  });
  it("rejects invalid operations without changing the editor", async () => {
    transport.invalid = true;
    await click("Send");
    expect(read("values")).toContain("Original explanation");
    expect(read("messages")).toContain('"state":"output-error"');
    expect(read("notice")).toContain("could not be prepared");
  });
  it("resets pending proposals and handles reused call ids", async () => {
    transport.callId = "reused";
    await click("Send");
    await click("Reset");
    expect(read("messages")).toBe("[]");
    await click("Send");
    await click("Accept changes");
    expect(read("values")).toContain("Improved explanation");
  });
});
