import {
  resolveActionErrorMessage,
  toActionErrorResult,
} from "@/lib/server/server-action-errors";

/** Resolve the route's safe error body; network/stream errors use a generic message. */
export function readAssistantErrorMessage(error: Error): string {
  let body: unknown = null;
  try {
    body = JSON.parse(error.message);
  } catch {
    // Network failures and aborted streams carry plain text, not a route body.
  }
  return resolveActionErrorMessage(toActionErrorResult(body));
}
