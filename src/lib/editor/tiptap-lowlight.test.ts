import { describe, expect, it } from "vitest";
import { tiptapLowlight } from "@/lib/editor/tiptap-lowlight";

describe("tiptapLowlight", () => {
  it.each([
    "java",
    "Java",
    "csharp",
    "cs",
    "c#",
    "C#",
  ])("highlights %s code blocks", (language) => {
    const highlighted = tiptapLowlight.highlight(
      language,
      'public class Demo { static void Main() { string name = "Notorium"; } }',
    );

    expect(highlighted.children.length).toBeGreaterThan(1);
  });

  it.each([
    "bash",
    "css",
    "html",
    "javascript",
    "json",
    "python",
    "sql",
    "typescript",
  ])("keeps common language support for %s", (language) => {
    expect(tiptapLowlight.registered(language)).toBe(true);
  });
});
