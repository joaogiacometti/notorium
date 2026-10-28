// Shared with outputs rendered by plainTextToRichText, which recognizes
// dollar-delimited LaTeX rather than other math delimiters.
export const MATH_RULE =
  "Write math as LaTeX with $...$ inline and $$...$$ for block equations, using single backslashes in LaTeX commands. Keep code and currency literal. Do not use other math delimiters or introduce images.";

// Drafts show math in this same format (draftHtmlForAssistant); math elements
// in edit HTML led models to put LaTeX in element text, which saved as empty
// equations.
export const EDITOR_HTML_MATH_RULE =
  "Write math as $...$ inline and $$...$$ alone in a paragraph for block equations, as in the draft; never as math HTML elements.";

export const USER_REQUEST_LANGUAGE_RULE =
  "Follow the user's most recent applicable explicit output-language instruction, respecting its task or conversation scope. Otherwise use the language of the latest user_request, including brief confirmations, corrections, and follow-ups when their wording identifies a language. Only if the request is language-neutral or ambiguous, use earlier user messages to resolve its language. Determine language from the user's own instructions, not quoted study material, request_context, application labels, subject names, existing cards, or earlier assistant output. Apply this to every chat reply, flashcard front and back, new or replacement prose, and example explanation, regardless of the resource language. Preserve code identifiers, intentional quotations, and content whose language is itself being studied; leave unrelated content unchanged during targeted edits.";
