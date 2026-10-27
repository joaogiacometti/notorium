import type { Page, Route } from "@playwright/test";
import type { UIMessageChunk } from "ai";
import { assistantChatRequestSchema } from "@/features/assistant/validation";

/** Provider-free document edit proposals, retaining the real client and save flow.
 * @example await new DocumentChatFixture().install(page);
 */
export class DocumentChatFixture {
  async install(page: Page): Promise<void> {
    await page.route("**/api/assistant/chat", (route) => this.respond(route));
  }
  private async respond(route: Route): Promise<void> {
    const request = assistantChatRequestSchema.parse(
      route.request().postDataJSON(),
    );
    const draft = request.documentDraft;
    if (!draft)
      throw new Error(
        "Missing document draft; expected an open document editor",
      );
    const input = {
      sessionId: draft.sessionId,
      revision: draft.revision,
      title: "Improved note title",
      replacements: [
        {
          firstBlockId: draft.blocks[0].id,
          lastBlockId: draft.blocks[0].id,
          html: "<p>A clearer explanation.</p>",
        },
      ],
    };
    const chunks: UIMessageChunk[] = [
      { type: "start" },
      {
        type: "tool-input-available",
        toolName: "proposeNoteEdits",
        toolCallId: `document-${request.messages.length}`,
        input,
      },
      { type: "finish" },
    ];
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "x-vercel-ai-ui-message-stream": "v1" },
      body: `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`,
    });
  }
}
