import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { useActiveFlashcardEditor } from "@/components/assistant/use-active-flashcard-editor";
import type { FlashcardFormValues } from "@/features/flashcards/validation";
import { FakeFlashcardEditChat } from "@/test/fake-flashcard-edit-chat";
import "@/components/assistant/flashcard-draft-content";

function DraftHarness() {
  const workspace = useAssistantWorkspace();
  const [open, setOpen] = useState(true);
  const [generation, setGeneration] = useState(0);
  const form = useForm<FlashcardFormValues>({
    defaultValues: {
      front: "<p>Original front</p>",
      back: "<p>Original back</p>",
      subjectId: "s1",
    },
  });
  const review = useActiveFlashcardEditor({
    form,
    enabled: open,
    blocked: false,
    resetVersion: generation,
  });
  const values = form.watch();
  return (
    <div>
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
      <button type="button" onClick={() => review.decide?.("back", false)}>
        Discard back
      </button>
      <button
        type="button"
        onClick={() =>
          form.setValue("front", "<p>New typing</p>", { shouldDirty: true })
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
        onClick={() => form.setValue("front", "x".repeat(100001))}
      >
        Oversize draft
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        Close
      </button>
      <button type="button" onClick={() => setGeneration(generation + 1)}>
        Reset draft
      </button>
      <button type="button" onClick={() => workspace?.reset()}>
        New chat
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
