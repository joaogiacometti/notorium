import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import {
  buildMathExtensions,
  MATH_KATEX_OPTIONS,
} from "@/lib/editor/tiptap-math-extensions";

function roundTrip(html: string): string {
  const editor = new Editor({
    extensions: [StarterKit, ...buildMathExtensions()],
    content: html,
  });
  const result = editor.getHTML();
  editor.destroy();
  return result;
}

describe("buildMathExtensions", () => {
  it("returns inline and block math nodes", () => {
    const names = buildMathExtensions().map((extension) => extension.name);
    expect(names).toEqual(["inlineMath", "blockMath"]);
  });

  it("applies the shared KaTeX safety options to every node", () => {
    for (const extension of buildMathExtensions()) {
      expect(extension.options.katexOptions).toEqual(MATH_KATEX_OPTIONS);
    }
  });

  it("disables KaTeX trust to block injection vectors", () => {
    expect(MATH_KATEX_OPTIONS.trust).toBe(false);
    expect(MATH_KATEX_OPTIONS.throwOnError).toBe(false);
  });

  it("keeps a single-dollar inline input rule but no block input rule", () => {
    const [inline, block] = buildMathExtensions();
    // The handler closures reference `this.type` only when an input rule fires,
    // so calling addInputRules with no context here is safe.
    const inlineRules = inline.config.addInputRules?.call(undefined as never);
    const blockRules = block.config.addInputRules?.call(undefined as never);
    expect(inlineRules).toHaveLength(1);
    expect(blockRules).toHaveLength(0);
  });

  it("round-trips stored inline math through the live schema", () => {
    const html = roundTrip(
      '<p>Area <span data-type="inline-math" data-latex="A = \\pi r^2"></span></p>',
    );
    expect(html).toContain('data-type="inline-math"');
    expect(html).toContain('data-latex="A = \\pi r^2"');
  });

  it("round-trips stored block math through the live schema", () => {
    const html = roundTrip(
      '<div data-type="block-math" data-latex="F = ma"></div>',
    );
    expect(html).toContain('data-type="block-math"');
    expect(html).toContain('data-latex="F = ma"');
  });

  it("inserts a block equation over a range (the /math save path)", () => {
    const editor = new Editor({
      extensions: [StarterKit, ...buildMathExtensions()],
      content: "<p>/math</p>",
    });
    editor
      .chain()
      .insertContentAt(
        { from: 0, to: editor.state.doc.content.size },
        { type: "blockMath", attrs: { latex: "E = mc^2" } },
      )
      .run();
    const html = editor.getHTML();
    editor.destroy();

    expect(html).toContain('data-type="block-math"');
    expect(html).toContain('data-latex="E = mc^2"');
    expect(html).not.toContain("/math");
  });

  it("updates an existing equation's LaTeX (the edit save path)", () => {
    const editor = new Editor({
      extensions: [StarterKit, ...buildMathExtensions()],
      content: '<p><span data-type="inline-math" data-latex="x"></span></p>',
    });
    let mathPos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "inlineMath") mathPos = pos;
    });
    editor.chain().updateInlineMath({ latex: "y", pos: mathPos }).run();
    const html = editor.getHTML();
    editor.destroy();

    expect(html).toContain('data-latex="y"');
    expect(html).not.toContain('data-latex="x"');
  });

  it("wires the click handler only when onClickMath is provided", () => {
    const withClick = buildMathExtensions({ onClickMath: () => {} });
    const withoutClick = buildMathExtensions();

    expect(
      withClick.every((extension) => extension.options.onClick !== undefined),
    ).toBe(true);
    expect(
      withoutClick.every(
        (extension) => extension.options.onClick === undefined,
      ),
    ).toBe(true);
  });
});
