import type { ChatTransport, UIMessageChunk } from "ai";
import { z } from "zod";
import {
  type FlashcardEditsInput,
  flashcardDraftSchema,
} from "@/features/assistant/edit-contract";
import type { AssistantUIMessage } from "@/features/assistant/types";

type ChatRequest = Parameters<
  ChatTransport<AssistantUIMessage>["sendMessages"]
>[0];

/** Controllable assistant stream for draft editing, including delayed replies.
 * @example const transport = new FakeFlashcardEditChat(); transport.replacements = { back: "<p>Answer</p>" };
 */
export class FakeFlashcardEditChat
  implements ChatTransport<AssistantUIMessage>
{
  readonly requests: ChatRequest[] = [];
  replacements: Pick<FlashcardEditsInput, "front" | "back"> = {};
  additionalReplacements: Pick<FlashcardEditsInput, "front" | "back">[] = [];
  delayed = false;
  callId?: string;
  private release: (() => void) | null = null;

  async sendMessages(
    request: ChatRequest,
  ): Promise<ReadableStream<UIMessageChunk>> {
    this.requests.push(request);
    const { draft } = z
      .object({ draft: flashcardDraftSchema })
      .parse(request.body);
    const input = {
      sessionId: draft.sessionId,
      revision: draft.revision,
    };
    const callId = this.callId ?? `edits-${this.requests.length}`;
    return new ReadableStream({
      start: (controller) => {
        controller.enqueue({ type: "start" });
        this.release = () => {
          for (const [index, replacement] of [
            this.replacements,
            ...this.additionalReplacements,
          ].entries()) {
            controller.enqueue({
              type: "tool-input-available",
              toolCallId: index === 0 ? callId : `${callId}-${index}`,
              toolName: "proposeFlashcardEdits",
              input: { ...input, ...replacement },
            });
          }
          controller.enqueue({ type: "finish" });
          controller.close();
        };
        if (!this.delayed) this.finishReply();
      },
    });
  }

  /** Complete the latest delayed proposal. @example transport.finishReply(); */
  finishReply(): void {
    this.release?.();
    this.release = null;
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
