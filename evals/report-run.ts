import { appendFileSync } from "node:fs";
import { formatRunSummary, readRunEntries } from "./transcripts";

/**
 * Vitest global setup: tag the run's transcripts, then report its scores in the
 * console and, in CI, on the workflow run's summary page.
 */
export function setup(): () => void {
  const runId = new Date().toISOString();
  process.env.EVAL_RUN_ID = runId;

  return () => {
    const summary = formatRunSummary(readRunEntries(runId));
    if (!summary) return;
    console.log(summary);
    const ciSummary = process.env.GITHUB_STEP_SUMMARY;
    if (ciSummary) appendFileSync(ciSummary, `${summary}\n`);
  };
}
