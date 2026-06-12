/**
 * File-size guard. Enforces the "files under 500 lines" rule from CLAUDE.md so
 * large modules can't creep in unnoticed as the codebase grows.
 *
 * Run with `bun run check:size`. Exits non-zero (failing CI) when a source file
 * exceeds its limit. New oversized files are blocked outright; the handful of
 * pre-existing offenders are grandfathered via KNOWN_OVERSIZED and may only
 * shrink, never grow.
 *
 * @example
 *   bun run check:size
 *   // -> "src/components/foo.tsx: 540 lines (limit 500)" then exit 1
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCE_ROOT = "src";
const DEFAULT_LIMIT = 500;
// Test files describe many scenarios and are allowed to run longer.
const TEST_LIMIT = 800;

/**
 * Tech-debt allow-list of files that already exceeded the limit when the guard
 * was introduced. Do NOT add entries: split the file and remove its line here
 * instead. Each file may only shrink — the guard fails if it grows past the
 * recorded count, ratcheting the codebase smaller over time.
 */
const KNOWN_OVERSIZED: Record<string, number> = {
  // Declarative Drizzle schema; split by table is a larger refactor.
  "src/db/schema.ts": 753,
  "src/components/subjects/subjects-list.tsx": 852,
  "src/components/planning/planning-assessments-table.tsx": 567,
  "src/components/flashcards/dialogs/edit-flashcard-dialog.tsx": 536,
  "src/components/shared/manager-data-table.tsx": 534,
  "src/components/shared/calendar-view.tsx": 527,
  "src/components/flashcards/review/flashcard-review-client.tsx": 518,
  "src/components/decks/deck-tree-sidebar.tsx": 510,
};

type Violation = { file: string; lines: number; limit: number };

function isTestFile(path: string): boolean {
  return /\.test\.tsx?$/.test(path);
}

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listSourceFiles(path));
      continue;
    }
    if (/\.tsx?$/.test(entry)) files.push(path);
  }
  return files;
}

// Count newlines so the result matches `wc -l`, which the allow-list caps were
// recorded with.
function countLines(path: string): number {
  const content = readFileSync(path, "utf8");
  const newlines = content.split("\n").length - 1;
  return content.endsWith("\n") ? newlines : newlines + 1;
}

function limitFor(file: string): number {
  const cap = KNOWN_OVERSIZED[file];
  if (cap !== undefined) return cap;
  return isTestFile(file) ? TEST_LIMIT : DEFAULT_LIMIT;
}

function findViolations(): Violation[] {
  const violations: Violation[] = [];
  for (const file of listSourceFiles(SOURCE_ROOT)) {
    const lines = countLines(file);
    const limit = limitFor(file);
    if (lines > limit) violations.push({ file, lines, limit });
  }
  return violations;
}

function report(violations: Violation[]): void {
  if (violations.length === 0) {
    console.log("File-size guard: all source files within limits.");
    return;
  }
  console.error("File-size guard failed:\n");
  for (const { file, lines, limit } of violations) {
    const grandfathered = file in KNOWN_OVERSIZED;
    const hint = grandfathered
      ? `exceeds its allow-listed cap of ${limit} — it must shrink, not grow`
      : `exceeds the ${limit}-line limit — split it by responsibility`;
    console.error(`  ${file}: ${lines} lines (${hint})`);
  }
  console.error(
    "\nSplit the file into focused modules. Do not raise limits to pass.",
  );
}

const violations = findViolations();
report(violations);
process.exit(violations.length > 0 ? 1 : 0);
