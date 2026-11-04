import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  formatRunSummary,
  readRunEntries,
  type TranscriptEntry,
} from "./transcripts";

function entry(overrides: Partial<TranscriptEntry>): TranscriptEntry {
  return {
    runId: "run-1",
    model: "model-a",
    area: "learning",
    case: "case-a",
    capability: false,
    passed: true,
    usage: { cost: 0.001 },
    ...overrides,
  };
}

describe("formatRunSummary", () => {
  it("scores trials by kind and lists only the cases that failed", () => {
    const summary = formatRunSummary([
      entry({ case: "stable" }),
      entry({ case: "stable" }),
      entry({ case: "flaky" }),
      entry({ case: "flaky", passed: false }),
      entry({ case: "hard", capability: true, passed: false }),
      entry({ case: "hard", capability: true }),
    ]);

    expect(summary).toBe(
      [
        "**Evals on model-a**",
        "- Regression: 3/4",
        "- Capability: 1/2",
        "- Cost: $0.0060",
        "- Failed: learning: flaky (1/2)",
        "- Failed: learning: hard (1/2)",
      ].join("\n"),
    );
  });

  it("reports an unknown cost when a call did not report one", () => {
    expect(formatRunSummary([entry({ usage: { cost: null } })])).toContain(
      "Cost: unknown",
    );
  });

  it("has nothing to report when no case ran", () => {
    expect(formatRunSummary([])).toBeNull();
  });
});

describe("readRunEntries", () => {
  const originalDirectory = process.cwd();
  let emptyDirectory: string | undefined;

  afterEach(() => {
    process.chdir(originalDirectory);
    if (emptyDirectory) rmSync(emptyDirectory, { recursive: true });
  });

  it("finds nothing when the run failed before writing a transcript", () => {
    emptyDirectory = mkdtempSync(join(tmpdir(), "evals-"));
    process.chdir(emptyDirectory);

    expect(readRunEntries("run-1")).toEqual([]);
  });
});
