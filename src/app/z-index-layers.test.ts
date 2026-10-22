import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Stacking must use the named `--z-index-*` layers in globals.css. Ad-hoc values
// (`z-110`, `z-120`) repeatedly hid dialogs behind the flashcard review surface;
// see "Z-index layers" in DESIGN.md.
const RAW_Z_INDEX_CLASS =
  /(?<![\w-])-?z-(?:\d+|\[[^\]\s]*\]|\([^)\s]*\))(?![\w-])/g;
// shadcn primitives hardcode `z-50` (the overlay layer) and are not hand-edited.
const EXEMPT_DIR = join("src", "components", "ui");

function listStyledSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return path === EXEMPT_DIR ? [] : listStyledSourceFiles(path);
    }
    const isSource = /\.(tsx?|css)$/.test(entry);
    return isSource && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

function findRawZIndexClasses(file: string): string[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .flatMap((text, index) =>
      Array.from(text.matchAll(RAW_Z_INDEX_CLASS), (match) => {
        return `${file}:${index + 1}: ${match[0]}`;
      }),
    );
}

describe("z-index layers", () => {
  it("defines the named layers, with overlays on shadcn's z-50", () => {
    const css = readFileSync("src/app/globals.css", "utf8");

    expect(css).toMatch(/--z-index-raised:\s*10;/);
    expect(css).toMatch(/--z-index-chrome:\s*30;/);
    expect(css).toMatch(/--z-index-immersive:\s*35;/);
    expect(css).toMatch(/--z-index-overlay:\s*50;/);
  });

  it("uses named layers instead of numeric or arbitrary z-index classes", () => {
    const violations =
      listStyledSourceFiles("src").flatMap(findRawZIndexClasses);

    // Fix by using z-raised | z-chrome | z-immersive | z-overlay. Overlays
    // stack by opening order; never raise one to win.
    expect(violations).toEqual([]);
  });
});
