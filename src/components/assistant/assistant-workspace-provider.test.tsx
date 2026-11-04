import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { useActiveFlashcardEditor } from "@/components/assistant/use-active-flashcard-editor";
import { useStudyContext } from "@/components/assistant/use-study-context";
import type { FlashcardFormValues } from "@/features/flashcards/validation";
import { testDocument } from "@/test/document";
import { FakeFlashcardEditChat } from "@/test/fake-flashcard-edit-chat";
import "@/components/assistant/flashcard-draft-content";

function NestedCardEditor() {
  const form = useForm<FlashcardFormValues>({
    defaultValues: {
      front: testDocument("Other front"),
      back: testDocument("Other back"),
      subjectId: "s1",
    },
  });
  useActiveFlashcardEditor({ form, enabled: true, blocked: false });
  return null;
}

function DraftHarness() {
  const workspace = useAssistantWorkspace();
  const [documentId, setDocumentId] = useState("underlying-note");
  const [pdfExcerpt, setPdfExcerpt] = useState<string | null>(null);
  useStudyContext(
    pdfExcerpt
      ? {
          kind: "pdf",
          documentId: "pdf",
          title: "Study material",
          content: pdfExcerpt,
          page: 2,
          scope: "selection",
          partial: false,
        }
      : {
          kind: "note",
          documentId,
          title: "Underlying note",
          content: "Background",
          partial: false,
        },
  );
  const [open, setOpen] = useState(true);
  const [nested, setNested] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [generation, setGeneration] = useState(0);
  const form = useForm<FlashcardFormValues>({
    defaultValues: {
      front: testDocument("<p>Original front</p>"),
      back: testDocument("<p>Original back</p>"),
      subjectId: "s1",
    },
  });
  const review = useActiveFlashcardEditor({
    form,
    enabled: open,
    blocked: () => blocked,
    resetVersion: generation,
  });
  const values = form.watch();
  return (
    <div>
      {nested ? <NestedCardEditor /> : null}
      <output data-testid="values">{JSON.stringify(values)}</output>
      <output data-testid="pending">
        {JSON.stringify(review.pending?.fields ?? {})}
      </output>
      <output data-testid="messages">
        {JSON.stringify(workspace?.chat.messages)}
      </output>
      <output data-testid="dirty">{String(form.formState.isDirty)}</output>
      <output data-testid="notice">{workspace?.notice}</output>
      <button
        type="button"
        onClick={() => void workspace?.send("Improve this")}
      >
        Send
      </button>
      <button type="button" onClick={() => review.decide?.("front", true)}>
        Accept front
      </button>
      <button type="button" onClick={() => review.decide?.("back", true)}>
        Accept back
      </button>
      <button
        type="button"
        onClick={() => {
          review.decide?.("back", true);
          review.decide?.("back", true);
        }}
      >
        Accept back twice
      </button>
      <button type="button" onClick={() => review.decide?.("back", false)}>
        Discard back
      </button>
      <button
        type="button"
        onClick={() =>
          form.setValue("front", testDocument("<p>New typing</p>"), {
            shouldDirty: true,
          })
        }
      >
        Type
      </button>
      <button
        type="button"
        onClick={() => form.reset({ ...form.getValues(), id: "another-card" })}
      >
        Switch card
      </button>
      <button
        type="button"
        onClick={() => form.setValue("front", testDocument("x".repeat(100001)))}
      >
        Oversize draft
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        Close
      </button>
      <button type="button" onClick={() => setNested(!nested)}>
        Toggle nested editor
      </button>
      <button type="button" onClick={() => setBlocked(true)}>
        Block editor
      </button>
      <button type="button" onClick={() => setGeneration(generation + 1)}>
        Reset draft
      </button>
      <button type="button" onClick={() => setDocumentId("another-note")}>
        Navigate document
      </button>
      <button type="button" onClick={() => setPdfExcerpt("First excerpt")}>
        Select PDF
      </button>
      <button type="button" onClick={() => setPdfExcerpt("Another excerpt")}>
        Change selection
      </button>
      <button type="button" onClick={() => void workspace?.send()}>
        Retry
      </button>
      <button type="button" onClick={() => workspace?.reset()}>
        New chat
      </button>
      <button
        type="button"
        onClick={() => {
          void workspace?.send("First request");
          void workspace?.send("Second request");
        }}
      >
        Send twice
      </button>
      <button
        type="button"
        onClick={() => {
          void workspace?.send("Pending request");
          workspace?.reset();
        }}
      >
        Send then reset
      </button>
    </div>
  );
}

describe("shared assistant flashcard editing", () => {
  let container: HTMLDivElement;
  let root: Root;
  let transport: FakeFlashcardEditChat;
  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    transport = new FakeFlashcardEditChat();
    await act(async () =>
      root.render(
        <AssistantWorkspaceProvider transport={transport}>
          <DraftHarness />
        </AssistantWorkspaceProvider>,
      ),
    );
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  });

  const read = (testId: string) =>
    container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? "";
  async function click(label: string) {
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === label)
        ?.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }

  it("checks the current editor availability when sending", async () => {
    await click("Block editor");
    await click("Send");
    expect(transport.requests).toHaveLength(0);
    expect(read("notice")).toContain("Wait for saving");
  });

  it("distinguishes a newly selected passage from an unchanged source during follow-ups", async () => {
    await click("Close");
    await click("Select PDF");
    await click("Send");
    expect(transport.requests.at(-1)?.body).toMatchObject({
      context: { content: "First excerpt", selectionChanged: true },
    });
    await click("Send");
    expect(transport.requests.at(-1)?.body).toMatchObject({
      context: { selectionChanged: false },
    });
    await click("Change selection");
    await click("Send");
    expect(transport.requests.at(-1)?.body).toMatchObject({
      context: { content: "Another excerpt", selectionChanged: true },
    });
    await click("New chat");
    await click("Send");
    expect(transport.requests.at(-1)?.body).toMatchObject({
      context: { selectionChanged: true },
    });
  });

  it("captures the document source on the user turn only when document context is active", async () => {
    await click("Send");
    expect(
      transport.requests[0].messages.findLast(
        (message) => message.role === "user",
      )?.metadata?.source,
    ).toBeUndefined();
    await click("Close");
    await click("Send");
    expect(
      transport.requests
        .at(-1)
        ?.messages.findLast((message) => message.role === "user")?.metadata
        ?.source,
    ).toEqual({ kind: "note", id: "underlying-note" });
  });

  it("refreshes the source when retrying from another document", async () => {
    await click("Close");
    await click("Send");
    await click("Navigate document");
    await click("Retry");
    expect(
      transport.requests
        .at(-1)
        ?.messages.findLast((message) => message.role === "user")?.metadata
        ?.source,
    ).toEqual({ kind: "note", id: "another-note" });
  });

  it("uses current unsaved content and independently accepts/discards fields", async () => {
    transport.replacements = {
      front: "<p>Better front</p>",
      back: "<p>Better back</p>",
    };
    await click("Send");
    expect(transport.requests[0].body).toMatchObject({
      draft: {
        front: "<p>Original front</p>",
        back: "<p>Original back</p>",
      },
    });
    expect(transport.requests[0].body).not.toHaveProperty("context");
    expect(read("pending")).toContain("Better front");
    expect(read("values")).toContain("Original front");
    expect(read("dirty")).toBe("false");
    await click("Accept front");
    expect(read("values")).toContain("Better front");
    expect(read("values")).toContain("Original back");
    expect(read("pending")).toContain("Better back");
    await click("Discard back");
    expect(read("pending")).toBe("{}");
    expect(read("dirty")).toBe("true");
    expect(read("messages")).toContain('"front":"accepted","back":"discarded"');
  });

  it("rejects a late reply after typing and keeps the newer content", async () => {
    transport.delayed = true;
    transport.replacements = { back: "<p>Suggestion</p>" };
    await click("Send");
    await click("Type");
    await act(async () => {
      transport.finishReply();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(read("pending")).toBe("{}");
    expect(read("values")).toContain("New typing");
    expect(read("messages")).toContain('"back":"stale"');
    expect(read("notice")).toContain("draft changed");
  });

  it.each(["Close", "Reset draft", "Switch card"])(
    "invalidates requests on %s",
    async (action) => {
      transport.delayed = true;
      transport.replacements = { back: "<p>Suggestion</p>" };
      await click("Send");
      await click(action);
      await act(async () => {
        transport.finishReply();
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(read("pending")).toBe("{}");
      expect(read("messages")).toContain('"back":"stale"');
    },
  );

  it("skips unresolved fields before a follow-up and sends the latest draft", async () => {
    transport.replacements = {
      front: "<p>Improved front</p>",
      back: "<p>Improved back</p>",
    };
    await click("Send");
    await click("Accept front");
    await click("Send");
    expect(transport.requests[1].body).toMatchObject({
      draft: {
        front: "<p>Improved front</p>",
        back: "<p>Original back</p>",
      },
    });
    expect(JSON.stringify(transport.requests[1].messages)).toContain(
      '"back":"skipped"',
    );
  });

  it("invalidates a late reply even after returning to the original editor", async () => {
    transport.delayed = true;
    transport.replacements = { back: "<p>Suggestion</p>" };
    await click("Send");
    await click("Toggle nested editor");
    await click("Toggle nested editor");
    await act(async () => {
      transport.finishReply();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(read("pending")).toBe("{}");
    expect(read("messages")).toContain('"back":"stale"');
    expect(read("values")).toContain("Original back");
  });

  it("accepts a field only once without generating another request", async () => {
    transport.replacements = { back: "<p>Suggestion</p>" };
    await click("Send");
    await click("Accept back twice");
    expect(read("values")).toContain("Suggestion");
    expect(read("pending")).toBe("{}");
    expect(read("messages").match(/"back":"accepted"/g)).toHaveLength(1);
    expect(transport.requests).toHaveLength(1);
  });

  it("records superseded proposals when a reply contains multiple edit calls", async () => {
    transport.replacements = { back: "<p>First suggestion</p>" };
    transport.additionalReplacements = [{ back: "<p>Second suggestion</p>" }];
    await click("Send");
    expect(read("pending")).toContain("Second suggestion");
    expect(read("messages")).toContain('"back":"skipped"');
    await click("Accept back");
    expect(read("messages")).toContain('"back":"accepted"');
  });

  it("keeps pending suggestions when an oversized draft prevents sending", async () => {
    transport.replacements = { back: "<p>Suggestion</p>" };
    await click("Send");
    await click("Oversize draft");
    await click("Send");
    expect(transport.requests).toHaveLength(1);
    expect(read("pending")).toContain("Suggestion");
    expect(read("notice")).toContain("too large");
  });

  it("clears proposals on new chat without reverting accepted edits", async () => {
    transport.replacements = {
      front: "<p>Improved front</p>",
      back: "<p>Improved back</p>",
    };
    await click("Send");
    await click("Accept front");
    await click("New chat");
    expect(read("pending")).toBe("{}");
    expect(read("messages")).toBe("[]");
    expect(read("values")).toContain("Improved front");
  });

  it("prevents concurrent sends while preparing a request", async () => {
    await click("Send twice");
    expect(transport.requests).toHaveLength(1);
    expect(read("messages")).toContain("First request");
    expect(read("messages")).not.toContain("Second request");
  });

  it("does not send a prepared request after new chat", async () => {
    await click("Send then reset");
    expect(transport.requests).toHaveLength(0);
    expect(read("messages")).toBe("[]");
    expect(read("notice")).toBe("");
  });
  it("handles fresh proposals after new chat even when the model reuses a call id", async () => {
    transport.callId = "reused-call";
    transport.replacements = { back: "<p>First suggestion</p>" };
    await click("Send");
    await click("New chat");
    transport.replacements = { back: "<p>Second suggestion</p>" };
    await click("Send");
    expect(read("pending")).toContain("Second suggestion");
  });
});
