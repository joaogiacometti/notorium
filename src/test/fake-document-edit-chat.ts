import type { ChatTransport, UIMessageChunk } from "ai";
import { z } from "zod";
import { documentDraftSchema } from "@/features/assistant/document-edit-contract";
import type { AssistantUIMessage } from "@/features/assistant/types";

type ChatRequest = Parameters<
  ChatTransport<AssistantUIMessage>["sendMessages"]
>[0];

/** Deterministic document proposals with optional delayed delivery.
 * @example const chat = new FakeDocumentEditChat(); chat.delayed = true;
 */
export class FakeDocumentEditChat implements ChatTransport<AssistantUIMessage> {
  readonly requests: ChatRequest[] = [];
  delayed = false;
  duplicate = false;
  invalid = false;
  rejectFirst = false;
  title: string | undefined;
  callId: string | undefined;
  private release: (() => void) | null = null;

  async sendMessages(
    request: ChatRequest,
  ): Promise<ReadableStream<UIMessageChunk>> {
    this.requests.push(request);
    const { documentDraft: draft } = z
      .object({ documentDraft: documentDraftSchema })
      .parse(request.body);
    const toolName =
      draft.kind === "note" ? "proposeNoteEdits" : "proposeMindmapEdits";
    const input =
      draft.kind === "note"
        ? {
            sessionId: draft.sessionId,
            revision: draft.revision,
            title: this.title,
            replacements: [
              {
                firstBlockId: this.invalid ? "missing" : draft.blocks[0]?.id,
                lastBlockId: draft.blocks[0]?.id,
                html: "<p>Improved explanation</p>",
              },
            ],
          }
        : {
            sessionId: draft.sessionId,
            revision: draft.revision,
            renameNodes: [
              {
                nodeId: this.invalid ? "missing" : draft.nodes[0]?.id,
                label: "Improved explanation",
              },
            ],
          };
    return new ReadableStream({
      start: (controller) => {
        controller.enqueue({ type: "start" });
        if (this.rejectFirst)
          controller.enqueue({
            type: "tool-input-error",
            toolName,
            toolCallId: `rejected-${this.requests.length}`,
            input,
            errorText: "Invalid edit target; expected a visible block id",
          });
        this.release = () => {
          const toolCallId = this.callId ?? `document-${this.requests.length}`;
          controller.enqueue({
            type: "tool-input-available",
            toolName,
            toolCallId,
            input,
          });
          if (this.duplicate)
            controller.enqueue({
              type: "tool-input-available",
              toolName,
              toolCallId: `${toolCallId}-second`,
              input,
            });
          controller.enqueue({ type: "finish" });
          controller.close();
        };
        if (!this.delayed) this.finishReply();
      },
    });
  }
  /** Release the current delayed reply. @example chat.finishReply(); */
  finishReply(): void {
    this.release?.();
    this.release = null;
  }
  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
