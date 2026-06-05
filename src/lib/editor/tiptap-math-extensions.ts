import { InputRule, nodePasteRule } from "@tiptap/core";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { KatexOptions } from "katex";

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
 * KaTeX options shared by every math surface. `trust: false` blocks injection
 * vectors such as \href and \includegraphics; `throwOnError: false` renders
 * invalid LaTeX as inline error text instead of crashing the editor.
 */
export const MATH_KATEX_OPTIONS: KatexOptions = {
  throwOnError: false,
  trust: false,
  strict: "ignore",
  maxExpand: 1000,
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
            this.type.create({ latex }),
          );
        },
      }),
    ];
  },

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
