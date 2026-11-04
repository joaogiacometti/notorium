/**
 * Real-model checks of behavior only the prompt and tool contracts enforce.
 * Each case is one paid assistant reply, so add a case only for a behavior worth
 * paying to recheck. Prefer code checks to judging replies with a model, check
 * what a good reply contains as well as what it must avoid, and read a sample
 * of the transcripts in evals/transcripts/, not only the pass count.
 */

import { execFileSync } from "node:child_process";
import type { UIMessageChunk } from "ai";
import { describe, it } from "vitest";
import type { z } from "zod";
import type { LibrarySearchOutput } from "@/features/assistant/library-search-contract";
import { streamAssistantReplyForUser } from "@/features/assistant/service";
import { assistantChatRequestSchema } from "@/features/assistant/validation";
import { readStreamedChunks } from "@/test/fake-streaming-model";
import { appendTranscript, readTrialCount } from "../transcripts";
import { takeModelUsage } from "./usage-recorder";

type ChatRequestInput = z.input<typeof assistantChatRequestSchema>;

export interface Reply {
  text: string;
  /** Tool calls that were accepted, in order. */
  tools: Array<{ toolName: string; input: unknown }>;
  toolNames: string[];
  /** Calls rejected by a guard or failed in `execute`; the model may recover. */
  rejectedTools: Array<{ toolName: string; error: string }>;
}

export interface AssistantEvalCase {
  name: string;
  messages: ChatRequestInput["messages"];
  /** Open material and other request fields, as the client would send them. */
  request?: Omit<ChatRequestInput, "messages" | "chatId">;
  /** What `searchLibrary` finds in this case; nothing by default. */
  searchHits?: LibrarySearchOutput["hits"];
  /**
   * A behavior still being worked toward, scored in the run summary without failing
   * the run. Cases without it are regressions, expected to pass nearly always.
   */
  capability?: boolean;
  check: (reply: Reply) => void;
}

/**
 * Declare one test per case and trial, since replies vary between runs, and
 * append each outcome to the area's transcript.
 * @example runAssistantEvals("learning", [{ name, messages, check }]);
 */
export function runAssistantEvals(
  area: string,
  cases: AssistantEvalCase[],
): void {
  const model = process.env.OPENROUTER_MODEL;
  const code = readCodeVersion();
  const trials = Array.from({ length: readTrialCount() }, (_, index) => index);
  const runs = cases.flatMap((evalCase) =>
    trials.map((trial) => ({ evalCase, trial: trial + 1 })),
  );

  describe(`${area} on ${model}`, () => {
    it.each(runs)(
      "$evalCase.name (trial $trial)",
      async ({ evalCase, trial }) => {
        let reply: Reply | null = null;
        let failure: unknown = null;
        try {
          reply = await askAssistant(evalCase);
          evalCase.check(reply);
        } catch (error) {
          failure = error;
        }
        appendTranscript(area, {
          runId: process.env.EVAL_RUN_ID ?? "",
          at: new Date().toISOString(),
          model: model ?? "",
          ...code,
          area,
          case: evalCase.name,
          trial,
          capability: evalCase.capability === true,
          passed: failure === null,
          failure: failure === null ? null : String(failure),
          usage: takeModelUsage(),
          reply,
        });
        if (failure instanceof Error)
          failure.message += `\nReply: ${JSON.stringify(reply)}`;
        if (failure !== null && !evalCase.capability) throw failure;
      },
    );
  });
}

async function askAssistant(evalCase: AssistantEvalCase): Promise<Reply> {
  const request = assistantChatRequestSchema.parse({
    ...evalCase.request,
    messages: evalCase.messages,
  });
  const result = await streamAssistantReplyForUser({
    ...request,
    userId: "eval-user",
    loadSubjectPaths: async () => ["Biology"],
    searchLibrary: async () => ({ hits: evalCase.searchHits ?? [] }),
  });
  if (!result.success) throw new Error(result.errorCode);

  const reply = readReply(
    readStreamedChunks(await result.response.text()) as UIMessageChunk[],
  );
  // An empty reply would satisfy every "did not do X" check.
  if (!reply.text && !reply.tools.length && !reply.rejectedTools.length)
    throw new Error("The model returned an empty reply");
  return reply;
}

function readReply(chunks: UIMessageChunk[]): Reply {
  let text = "";
  const accepted = new Map<string, { toolName: string; input: unknown }>();
  // By call id: a rejected call can report both an input and an output error.
  const rejected = new Map<string, Reply["rejectedTools"][number]>();

  for (const chunk of chunks) {
    if (chunk.type === "error") throw new Error(chunk.errorText);
    if (chunk.type === "text-delta") text += chunk.delta;
    if (chunk.type === "tool-input-available")
      accepted.set(chunk.toolCallId, {
        toolName: chunk.toolName,
        input: chunk.input,
      });
    if (chunk.type === "tool-input-error") {
      accepted.delete(chunk.toolCallId);
      rejected.set(chunk.toolCallId, {
        toolName: chunk.toolName,
        error: chunk.errorText,
      });
    }
    if (chunk.type === "tool-output-error") {
      const call = accepted.get(chunk.toolCallId);
      if (call) {
        accepted.delete(chunk.toolCallId);
        rejected.set(chunk.toolCallId, {
          toolName: call.toolName,
          error: chunk.errorText,
        });
      }
    }
  }

  const tools = [...accepted.values()];
  return {
    text,
    tools,
    toolNames: tools.map((tool) => tool.toolName),
    rejectedTools: [...rejected.values()],
  };
}

// Uncommitted prompt edits are the usual thing being evaluated, so a commit
// alone would not identify the code a result came from.
function readCodeVersion(): { commit: string; dirty: boolean } {
  const git = (...args: string[]) =>
    execFileSync("git", args, { encoding: "utf8" }).trim();
  return {
    commit: git("rev-parse", "--short", "HEAD"),
    dirty: git("status", "--porcelain") !== "",
  };
}
