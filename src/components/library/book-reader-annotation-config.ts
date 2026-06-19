// Shared identifiers and visual defaults for the reader's highlight tool. The
// tool id matches EmbedPDF's built-in "highlight" tool so we override (rather
// than add) it; the category is our own so the plugin's lock mode can keep every
// other annotation read-only while leaving user highlights editable.
export const HIGHLIGHT_TOOL_ID = "highlight";
export const HIGHLIGHT_CATEGORY = "userHighlight";

// Highlight color and opacity are annotation *data* baked into the PDF markup,
// not DOM styling, so they must be concrete values rather than theme variables.
// A warm yellow at low opacity reads as a classic highlighter over both light
// and inverted ("Dark PDF reader") pages.
export const HIGHLIGHT_COLOR = "#f6d34a";
export const HIGHLIGHT_OPACITY = 0.4;
