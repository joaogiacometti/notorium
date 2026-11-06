// Model text is parsed as Markdown (modelMarkdownToDocument), which reads
// dollar-delimited LaTeX rather than other math delimiters.
export const MATH_RULE =
  "Write every mathematical symbol and expression as LaTeX with $...$ inline and $$...$$ for block equations; never place an undelimited duplicate beside an equation. In chat use single backslashes in LaTeX commands. In JSON tool arguments, escape each backslash as required by JSON so the decoded string contains a literal backslash, not a tab, backspace, or other control character. Keep code and currency literal. Do not use other math delimiters or introduce images.";

// Drafts are shown in this same Markdown (draftMarkdownForAssistant).
export const EDITOR_MARKDOWN_RULE =
  "Write Markdown: paragraphs, #, ##, or ### headings, **bold**, *italic*, - or 1. lists, `code`, language-tagged code fences, and tables. Write math as $...$ inline and $$...$$ on its own line for block equations. Never write HTML or images.";

export const OUTPUT_LANGUAGE_RULE =
  "Always write in English, including chat, flashcards, and note text. Keep code, quotations, and any language being studied as they are.";
