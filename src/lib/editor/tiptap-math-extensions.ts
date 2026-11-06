import { InputRule, nodePasteRule } from "@tiptap/core";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { MATH_KATEX_OPTIONS } from "@/lib/math/katex";

/** A math node the user clicked, surfaced so the editor can open its editor. */
export type MathClickTarget = {
  type: "inlineMath" | "blockMath";
  pos: number;
  latex: string;
};

export type MathExtensionOptions = {
  /**
   * Called when a rendered equation is clicked. The upstream extension ships no
   * inline LaTeX editor — editing is entirely delegated to this callback. Omit
   * it (e.g. in the read-only renderer) to keep equations non-interactive.
   */
  onClickMath?: (target: MathClickTarget) => void;
};

/**
 * Conventional inline math: a single-dollar pair like `$E = mc^2$`. The negative
 * lookbehind avoids colliding with `$$`, and `[^$\n]+?` keeps it to one line.
 * The upstream extension instead binds `$$` to inline, which surprises users
 * coming from LaTeX/Anki/Obsidian, so we override it (see buildMathExtensions).
 */
const INLINE_MATH_INPUT_RULE = /(?<!\$)\$([^$\n]+?)\$$/;
// Paste rules scan the whole pasted text (global flag). The lookaround keeps
// `$...$` from matching inside a `$$...$$` block pair.
const INLINE_MATH_PASTE_RULE = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g;
const BLOCK_MATH_PASTE_RULE = /\$\$([^$\n]+?)\$\$/g;

const MARKDOWN_MATH = [
  [/^\$\$([^$]+?)\$\$/, "blockMath"],
  [/^\$(?!\s)([^$]+?)(?<!\s)\$(?![$\d])/, "inlineMath"],
] as const;

const ConventionalInlineMath = InlineMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: INLINE_MATH_INPUT_RULE,
        handler: ({ state, range, match }) => {
          const latex = match[1]?.trim();
          if (!latex) return;
          state.tr.replaceWith(
            range.from,
            range.to,
            state.schema.node(this.name, { latex }),
          );
        },
      }),
    ];
  },

  // Markdown exchange (document-markdown.ts). Dollar math follows Pandoc's
  // tex_math_dollars rule, so "$20 and $30" stays text: the opening `$` can't
  // precede a space and the closing `$` can't follow one or precede a digit.
  // Backslash delimiters stay unsupported: in CommonMark `\[` is an escaped
  // bracket. Inside list items marked finds block math only at a line start,
  // so display math is also tokenized inline and documentFromMarkdown lifts it.
  markdownTokenizer: {
    name: "inlineMath",
    level: "inline",
    start: (src: string) => src.indexOf("$"),
    tokenize: (src: string) => {
      for (const [pattern, type] of MARKDOWN_MATH) {
        const match = pattern.exec(src);
        const latex = match?.[1].trim();
        if (match && latex) return { type, raw: match[0], latex };
      }
    },
  },
  renderMarkdown: (node) => `$${String(node.attrs?.latex ?? "").trim()}$`,

  // Input rules only fire on keystrokes, so pasted `$...$` needs its own rule.
  addPasteRules() {
    return [
      nodePasteRule({
        find: INLINE_MATH_PASTE_RULE,
        type: this.type,
        getAttributes: (match) => ({ latex: match[1]?.trim() ?? "" }),
      }),
    ];
  },
});

// Block math is inserted through the `/math` slash command, so the node carries
// no live input rule (the upstream `$$$` trigger is intentionally dropped). A
// paste rule still converts pasted `$$...$$`. See tiptap-slash-commands.ts.
const SlashOnlyBlockMath = BlockMath.extend({
  addInputRules() {
    return [];
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: BLOCK_MATH_PASTE_RULE,
        type: this.type,
        getAttributes: (match) => ({ latex: match[1]?.trim() ?? "" }),
      }),
    ];
  },
});

/**
 * Returns the shared Tiptap math extensions (inline + block) used by both the
 * editor and the read-only renderer, so stored math round-trips identically.
 * Pass `onClickMath` in editable contexts to enable click-to-edit.
 * @example extensions: [...buildMathExtensions({ onClickMath })]
 */
export function buildMathExtensions(options: MathExtensionOptions = {}) {
  const makeOnClick = options.onClickMath
    ? (type: MathClickTarget["type"]) => (node: ProseMirrorNode, pos: number) =>
        options.onClickMath?.({ type, pos, latex: getNodeLatex(node) })
    : undefined;

  return [
    ConventionalInlineMath.configure({
      katexOptions: MATH_KATEX_OPTIONS,
      onClick: makeOnClick?.("inlineMath"),
    }),
    SlashOnlyBlockMath.configure({
      katexOptions: MATH_KATEX_OPTIONS,
      onClick: makeOnClick?.("blockMath"),
    }),
  ] as const;
}

function getNodeLatex(node: ProseMirrorNode): string {
  const latex = node.attrs.latex;
  return typeof latex === "string" ? latex : "";
}
