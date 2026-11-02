/** Source/test size guard for CI and `npm run check:size`. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SOURCE_ROOT = "src";
const DEFAULT_LIMIT = 500;
// Test files describe many scenarios and are allowed to run longer.
const TEST_LIMIT = 800;

// Keep the canonical Drizzle schema together; this is a deliberate exemption.
const SIZE_GUARD_EXEMPT = new Set<string>(["src/db/schema.ts"]);

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

function countLines(path: string): number {
  const content = readFileSync(path, "utf8");
  const newlines = content.split("\n").length - 1;
  return content.endsWith("\n") ? newlines : newlines + 1;
}

function limitFor(file: string): number {
  return isTestFile(file) ? TEST_LIMIT : DEFAULT_LIMIT;
}

function findViolations(): Violation[] {
  const violations: Violation[] = [];
  for (const file of listSourceFiles(SOURCE_ROOT)) {
    if (SIZE_GUARD_EXEMPT.has(file)) continue;
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
    console.error(
      `  ${file}: ${lines} lines (exceeds the ${limit}-line limit — split it by responsibility)`,
    );
  }
  console.error(
    "\nSplit the file into focused modules. Do not raise limits to pass.",
  );
}

const violations = findViolations();
report(violations);
process.exit(violations.length > 0 ? 1 : 0);
