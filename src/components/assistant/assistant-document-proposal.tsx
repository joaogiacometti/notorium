"use client";

import type { AssistantUIMessage } from "@/features/assistant/types";

export type DocumentProposalPart = Extract<
  AssistantUIMessage["parts"][number],
  { type: "tool-proposeNoteEdits" | "tool-proposeMindmapEdits" }
>;

/** Keep only the resolved outcome in chat; document differences belong in the workspace.
 * @example <AssistantDocumentProposal proposal={part} />
 */
export function AssistantDocumentProposal({
  proposal,
}: Readonly<{ proposal: DocumentProposalPart }>) {
  if (
    proposal.state !== "output-available" &&
    proposal.state !== "output-error"
  )
    return null;
  const labels = {
    accepted: "Changes accepted in the document.",
    discarded: "Changes discarded.",
    skipped: "Changes skipped.",
    stale: "The document changed. Ask again for a fresh proposal.",
  };
  return (
    <p className="text-xs text-muted-foreground">
      {proposal.state === "output-available"
        ? labels[proposal.output.outcome]
        : "These changes could not be prepared. Ask again to retry."}
    </p>
  );
}

/** Document proposal parts that have settled enough to show an outcome.
 * @example readDocumentProposalParts(message).map(...);
 */
export function readDocumentProposalParts(
  message: AssistantUIMessage,
): DocumentProposalPart[] {
  return message.parts.filter(
    (part, index): part is DocumentProposalPart =>
      (part.type === "tool-proposeNoteEdits" ||
        part.type === "tool-proposeMindmapEdits") &&
      part.state !== "input-streaming" &&
      !(part.state === "output-error" && answeredLater(message, index)),
  );
}

// A proposal the server rejected goes back to the model, which corrects it or
// explains in the same reply; only an unanswered failure needs the notice.
function answeredLater(message: AssistantUIMessage, index: number): boolean {
  return message.parts
    .slice(index + 1)
    .some(
      (part) =>
        (part.type === "text" && part.text.trim() !== "") ||
        part.type.startsWith("tool-"),
    );
}
