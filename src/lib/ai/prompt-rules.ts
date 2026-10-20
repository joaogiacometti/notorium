// Prompt fragments shared by every AI feature whose output is rendered through
// `plainTextToRichText` (`src/lib/ai/plain-text-rich-text.ts`), which only turns
// `$...$`/`$$...$$` into math nodes.
export const MATH_RULE =
  "Math notation: write mathematical expressions as LaTeX — $...$ for inline math (e.g. $E = mc^2$) and $$...$$ for a standalone block equation. Do not use \\( \\), \\[ \\], Unicode math symbols, or add new images. This LaTeX is the only exception to the plain-text rule.";
