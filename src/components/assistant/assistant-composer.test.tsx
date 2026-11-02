import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AssistantComposer } from "@/components/assistant/assistant-composer";

/** Records submissions and controls whether preflight accepts the message. */
class FakeMessageSubmission {
  readonly messages: string[] = [];
  resets = 0;
  reset = (): void => {
    this.resets += 1;
  };
  constructor(private readonly accepted: boolean) {}
  send = async (message: string): Promise<boolean> => {
    this.messages.push(message);
    return this.accepted;
  };
}

describe("assistant composer", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  });

  it.each([true, false])(
    "preserves the message when preflight declines it (accepted=%s)",
    async (accepted) => {
      const submission = await renderComposer(false, accepted);
      const textarea = container.querySelector("textarea");
      expect(document.activeElement).toBe(textarea);
      await typeDraft("Improve this card");
      await act(async () =>
        container
          .querySelector("form")
          ?.dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          ),
      );
      expect(submission.messages).toEqual(["Improve this card"]);
      expect(textarea?.value).toBe(accepted ? "" : "Improve this card");
    },
  );

  async function renderComposer(
    busy = false,
    accepted = true,
  ): Promise<FakeMessageSubmission> {
    const submission = new FakeMessageSubmission(accepted);
    await act(async () =>
      root.render(
        <AssistantComposer
          busy={busy}
          onSend={submission.send}
          onStop={() => {}}
          onNewChat={submission.reset}
          focusRequested
        />,
      ),
    );
    return submission;
  }

  async function typeDraft(text: string): Promise<void> {
    await act(async () => {
      const textarea = container.querySelector("textarea");
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set?.call(textarea, text);
      textarea?.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  async function pressKey(
    key: string,
    options: KeyboardEventInit = {},
  ): Promise<KeyboardEvent> {
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    });
    await act(async () => {
      container.querySelector("textarea")?.dispatchEvent(event);
    });
    return event;
  }

  it.each(["/", "/n", "/ne", "/new"])(
    "offers and executes %s with Enter",
    async (draft) => {
      const submission = await renderComposer();
      await typeDraft(draft);
      const option = container.querySelector('[role="option"]');
      expect(option?.textContent).toContain("New chat");
      expect(option?.getAttribute("aria-selected")).toBe("true");
      expect(
        container.querySelector('[role="listbox"]')?.getAttribute("aria-label"),
      ).toBe("Assistant commands");
      expect(
        container
          .querySelector("textarea")
          ?.getAttribute("aria-activedescendant"),
      ).toBe(option?.id);
      expect(
        container.querySelector("textarea")?.getAttribute("aria-controls"),
      ).toBe(container.querySelector('[role="listbox"]')?.id);
      await pressKey("ArrowDown");
      await pressKey("ArrowUp");
      await pressKey("Enter");
      expect(submission.resets).toBe(1);
      expect(submission.messages).toEqual([]);
      expect(container.querySelector("textarea")?.value).toBe("");
      expect(document.activeElement).toBe(container.querySelector("textarea"));
      expect(container.querySelector('[role="listbox"]')).toBeNull();
    },
  );

  it("lists both commands for a bare slash and moves the highlight with arrows", async () => {
    await renderComposer();
    await typeDraft("/");
    const optionTexts = () =>
      [...container.querySelectorAll('[role="option"]')].map(
        (option) => option.textContent,
      );
    const selected = () =>
      container.querySelector('[role="option"][aria-selected="true"]');
    expect(optionTexts()).toEqual([
      expect.stringContaining("New chat"),
      expect.stringContaining("Learn a topic"),
    ]);
    await pressKey("ArrowDown");
    expect(selected()?.textContent).toContain("Learn a topic");
    expect(
      container
        .querySelector("textarea")
        ?.getAttribute("aria-activedescendant"),
    ).toBe(selected()?.id);
    await pressKey("ArrowDown");
    expect(selected()?.textContent).toContain("New chat");
    await pressKey("ArrowUp");
    expect(selected()?.textContent).toContain("Learn a topic");
  });

  it.each(["/l", "/learn"])(
    "fills %s as a lesson prefix with Enter and sends the topic as a message",
    async (draft) => {
      const submission = await renderComposer();
      await typeDraft(draft);
      const options = container.querySelectorAll('[role="option"]');
      expect(options).toHaveLength(1);
      expect(options[0]?.textContent).toContain("Learn a topic");
      await pressKey("Enter");
      const textarea = container.querySelector("textarea");
      expect(textarea?.value).toBe("/learn ");
      expect(document.activeElement).toBe(textarea);
      expect(container.querySelector('[role="listbox"]')).toBeNull();
      expect(submission.messages).toEqual([]);
      await typeDraft("/learn binary search");
      await pressKey("Enter");
      expect(submission.resets).toBe(0);
      expect(submission.messages).toEqual(["/learn binary search"]);
    },
  );

  it("fills the lesson prefix when Learn a topic is clicked", async () => {
    const submission = await renderComposer();
    await typeDraft("/");
    await act(async () => {
      [...container.querySelectorAll<HTMLElement>('[role="option"]')]
        .find((option) => option.textContent?.includes("Learn a topic"))
        ?.click();
    });
    expect(container.querySelector("textarea")?.value).toBe("/learn ");
    expect(submission.messages).toEqual([]);
  });

  it.each([false, true])(
    "resets on exact trimmed form submission even when busy=%s",
    async (busy) => {
      const submission = await renderComposer(busy);
      await typeDraft("  /new\n");
      await act(async () => {
        container
          .querySelector("form")
          ?.dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          );
      });
      expect(submission.resets).toBe(1);
      expect(submission.messages).toEqual([]);
      expect(container.querySelector("textarea")?.value).toBe("");
    },
  );

  it("executes a clicked command while busy", async () => {
    const submission = await renderComposer(true);
    await typeDraft("/n");
    await act(async () => {
      container.querySelector<HTMLElement>('[role="option"]')?.click();
    });
    expect(submission.resets).toBe(1);
    expect(submission.messages).toEqual([]);
    expect(document.activeElement).toBe(container.querySelector("textarea"));
  });

  it("dismisses with Escape without bubbling or losing the draft, but still submits exact /new", async () => {
    const submission = await renderComposer();
    await typeDraft("/new");
    let escaped = false;
    document.addEventListener(
      "keydown",
      () => {
        escaped = true;
      },
      { once: true },
    );
    await pressKey("Escape");
    expect(escaped).toBe(false);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(container.querySelector("textarea")?.value).toBe("/new");
    await pressKey("Enter");
    expect(submission.resets).toBe(1);
  });

  it.each([
    "/NEW",
    "/new topic",
    "Explain /new",
    "Explain\n/new",
    "`/new`",
    "/unknown",
  ])("sends %s as ordinary text", async (draft) => {
    const submission = await renderComposer();
    await typeDraft(draft);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    await pressKey("Enter");
    expect(submission.resets).toBe(0);
    expect(submission.messages).toEqual([draft]);
  });

  it("preserves Shift+Enter and IME Enter without executing a command", async () => {
    const submission = await renderComposer();
    await typeDraft("/new");
    expect((await pressKey("Enter", { shiftKey: true })).defaultPrevented).toBe(
      false,
    );
    expect(
      (await pressKey("Enter", { isComposing: true })).defaultPrevented,
    ).toBe(false);
    expect(submission.resets).toBe(0);
    expect(submission.messages).toEqual([]);
  });

  it("reopens the menu after editing a dismissed draft without executing a partial command", async () => {
    const submission = await renderComposer();
    await typeDraft("/n");
    await pressKey("Escape");
    await pressKey("Enter");
    expect(submission.messages).toEqual(["/n"]);
    await typeDraft("/ne");
    expect(container.querySelector('[role="listbox"]')).not.toBeNull();
  });

  it("removes suggestions when a matching prefix becomes ordinary text", async () => {
    const submission = await renderComposer();
    await typeDraft("/new");
    expect(container.querySelector('[role="option"]')).not.toBeNull();
    await typeDraft("/new topic");
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    await pressKey("Enter");
    expect(submission.resets).toBe(0);
    expect(submission.messages).toEqual(["/new topic"]);
  });

  it("keeps ordinary messages blocked during a reply", async () => {
    const submission = await renderComposer(true);
    await typeDraft("/unknown");
    await pressKey("Enter");
    expect(submission.resets).toBe(0);
    expect(submission.messages).toEqual([]);
    expect(container.querySelector("textarea")?.value).toBe("/unknown");
  });
});
