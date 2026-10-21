import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AssistantComposer } from "@/components/assistant/assistant-composer";

/** Records submissions and controls whether preflight accepts the message. */
class FakeMessageSubmission {
  readonly messages: string[] = [];
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
      const submission = new FakeMessageSubmission(accepted);
      await act(async () =>
        root.render(
          <AssistantComposer
            busy={false}
            onSend={submission.send}
            onStop={() => {}}
            focusRequested
          />,
        ),
      );
      const textarea = container.querySelector("textarea");
      expect(document.activeElement).toBe(textarea);
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )?.set?.call(textarea, "Improve this card");
        textarea?.dispatchEvent(new Event("input", { bubbles: true }));
      });
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
});
