// Shared with outputs rendered by plainTextToDocument, which recognizes
// dollar-delimited LaTeX rather than other math delimiters.
export const MATH_RULE =
  "Write every mathematical symbol and expression as LaTeX with $...$ inline and $$...$$ for block equations; never place an undelimited duplicate beside an equation. In chat use single backslashes in LaTeX commands. In JSON tool arguments, escape each backslash as required by JSON so the decoded string contains a literal backslash, not a tab, backspace, or other control character. Keep code and currency literal. Do not use other math delimiters or introduce images.";

// Drafts show math in this same format (draftHtmlForAssistant); math elements
// in edit HTML led models to put LaTeX in element text, which saved as empty
// equations.
export const EDITOR_HTML_MATH_RULE =
  "Write math as $...$ inline and $$...$$ alone in a paragraph for block equations, as in the draft; never as math HTML elements.";

export const OUTPUT_LANGUAGE_RULE =
  "Always write in English, including chat, flashcards, and note text. Keep code, quotations, and any language being studied as they are.";
