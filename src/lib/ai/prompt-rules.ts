// Shared with outputs rendered by plainTextToRichText, which recognizes
// dollar-delimited LaTeX rather than other math delimiters.
export const MATH_RULE =
  "Write math as LaTeX with $...$ inline and $$...$$ for block equations, using single backslashes in LaTeX commands. Keep code and currency literal. Do not use other math delimiters or introduce images.";

// Drafts show math in this same format (draftHtmlForAssistant); math elements
// in edit HTML led models to put LaTeX in element text, which saved as empty
// equations.
export const EDITOR_HTML_MATH_RULE =
  "Write math as $...$ inline and $$...$$ alone in a paragraph for block equations, as in the draft; never as math HTML elements.";
