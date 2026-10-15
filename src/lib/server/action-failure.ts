import { unstable_rethrow } from "next/navigation";
import {
  type ActionErrorResult,
  actionError,
} from "@/lib/server/server-action-errors";

/**
 * Run a Server Action body and convert unexpected throws (DB, provider, or
 * runtime errors) into a generic action error so nothing internal crosses the
 * client boundary. Next.js control flow (redirect, notFound) is rethrown.
 *
 * @example
 * return runCatchingActionFailure("notes.editNote", () =>
 *   editNoteForUser(userId, data),
 * );
 */
export async function runCatchingActionFailure<TResult>(
  logScope: string,
  run: () => Promise<TResult> | TResult,
): Promise<TResult | ActionErrorResult> {
  try {
    return await run();
  } catch (error) {
    unstable_rethrow(error);
    logActionFailure(logScope, error);
    return actionError("common.generic");
  }
}

// Logs only the error class and driver code: Drizzle query errors embed the
// SQL params in `message`, which can carry private user content.
function logActionFailure(logScope: string, error: unknown): void {
  console.error(
    JSON.stringify({
      event: "server_action_failed",
      scope: logScope,
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: getDriverErrorCode(error),
    }),
  );
}

function getDriverErrorCode(error: unknown): string | undefined {
  const source = error instanceof Error && error.cause ? error.cause : error;
  if (typeof source !== "object" || source === null || !("code" in source)) {
    return undefined;
  }

  return typeof source.code === "string" ? source.code : undefined;
}
