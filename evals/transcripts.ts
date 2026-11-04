import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";

const TRANSCRIPT_DIR = "evals/transcripts";
const DEFAULT_TRIALS = 3;

/** The part of a transcript line that the run summary reads. */
export interface TranscriptEntry {
  runId: string;
  model: string;
  area: string;
  case: string;
  capability: boolean;
  passed: boolean;
  usage: { cost: number | null };
}

/**
 * Trials per case; replies vary between runs, so one pass proves little.
 * @example readTrialCount(); // 3 unless EVAL_TRIALS is set
 */
export function readTrialCount(): number {
  const trials = Number(process.env.EVAL_TRIALS ?? DEFAULT_TRIALS);
  if (!Number.isInteger(trials) || trials < 1)
    throw new Error("EVAL_TRIALS must be a positive integer");
  return trials;
}

/**
 * Append one line to the area's transcript.
 * @example appendTranscript("learning", entry);
 */
export function appendTranscript(
  area: string,
  entry: TranscriptEntry & Record<string, unknown>,
): void {
  mkdirSync(TRANSCRIPT_DIR, { recursive: true });
  appendFileSync(
    join(TRANSCRIPT_DIR, `assistant-${area}.jsonl`),
    `${JSON.stringify(entry)}\n`,
  );
}

/**
 * Read one run's entries back from every area's transcript. A run that failed
 * before its first reply has none, so its own error stays the only one reported.
 * @example readRunEntries(process.env.EVAL_RUN_ID);
 */
export function readRunEntries(runId: string): TranscriptEntry[] {
  if (!existsSync(TRANSCRIPT_DIR)) return [];
  return readdirSync(TRANSCRIPT_DIR, { withFileTypes: true })
    .filter((file) => file.isFile() && file.name.endsWith(".jsonl"))
    .flatMap((file) =>
      readFileSync(join(TRANSCRIPT_DIR, file.name), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as TranscriptEntry),
    )
    .filter((entry) => entry.runId === runId);
}

/**
 * Markdown scores for a finished run, listing only the cases that failed.
 * @example formatRunSummary(readRunEntries(runId));
 */
export function formatRunSummary(entries: TranscriptEntry[]): string | null {
  const first = entries[0];
  if (!first) return null;

  const cases = new Map<string, TranscriptEntry[]>();
  for (const entry of entries) {
    const key = `${entry.area}: ${entry.case}`;
    cases.set(key, [...(cases.get(key) ?? []), entry]);
  }
  const failures = [...cases].filter(([, trials]) =>
    trials.some((trial) => !trial.passed),
  );
  const capability = entries.filter((entry) => entry.capability);

  return [
    `**Evals on ${first.model}**`,
    `- Regression: ${scoreOf(entries.filter((entry) => !entry.capability))}`,
    ...(capability.length ? [`- Capability: ${scoreOf(capability)}`] : []),
    `- Cost: ${formatCost(entries)}`,
    ...failures.map(
      ([name, trials]) => `- Failed: ${name} (${scoreOf(trials)})`,
    ),
  ].join("\n");
}

function scoreOf(entries: TranscriptEntry[]): string {
  return `${entries.filter((entry) => entry.passed).length}/${entries.length}`;
}

function formatCost(entries: TranscriptEntry[]): string {
  if (entries.some((entry) => entry.usage.cost === null)) return "unknown";
  const total = entries.reduce(
    (sum, entry) => sum + (entry.usage.cost ?? 0),
    0,
  );
  return `$${total.toFixed(4)}`;
}
