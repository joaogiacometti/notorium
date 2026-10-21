import type { Page, Route } from "@playwright/test";
import type { UIMessageChunk } from "ai";
import type { ProposedFlashcard } from "@/features/assistant/tools";
import {
  type AssistantChatRequest,
  assistantChatRequestSchema,
} from "@/features/assistant/validation";

/** Provider-free chat responses for draft edits or supplied creation proposals.
 * @example await new AssistantChatFixture().install(page);
 */
export class AssistantChatFixture {
  readonly requests: AssistantChatRequest[] = [];
  constructor(private readonly cards: ProposedFlashcard[] = []) {}
  async install(page: Page): Promise<void> {
    await page.route("**/api/assistant/chat", (route) => this.respond(route));
  }

  private async respond(route: Route): Promise<void> {
    const request = assistantChatRequestSchema.parse(
      route.request().postDataJSON(),
    );
    this.requests.push(request);
    const draft = request.draft;
    const chunks: UIMessageChunk[] = this.cards.length
      ? this.creationChunks(request.messages.length)
      : draft
        ? [
            { type: "start" },
            {
              type: "tool-input-available",
              toolName: "proposeFlashcardEdits",
              toolCallId: `edit-${request.messages.length}`,
              input: {
                sessionId: draft.sessionId,
                revision: draft.revision,
                back: "<p>A concise improved answer.</p>",
              },
            },
            { type: "finish" },
          ]
        : [
            { type: "start" },
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "I can help you study." },
            { type: "text-end", id: "t" },
            { type: "finish" },
          ];
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body: `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`,
    });
  }

  private creationChunks(turn: number): UIMessageChunk[] {
    return [
      { type: "start" },
      {
        type: "tool-input-available",
        toolName: "proposeFlashcards",
        toolCallId: `create-${turn}`,
        input: { cards: this.cards },
      },
      { type: "finish" },
    ];
  }
}
