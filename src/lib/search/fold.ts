const COMBINING_MARKS = /\p{M}/gu;
const NON_ASCII_CHARACTER = /[\u0080-\u{10ffff}]/gu;

/**
 * Lowercase `value` and strip accents one character at a time, so every index
 * into the folded text is the same index into `value` and highlights can
 * slice the original at a folded match. Characters whose fold would change
 * length (ß, ligatures, a lone combining mark) keep their lowercase form.
 * Mirrors the database's `immutable_unaccent` + `ILIKE` closely enough for
 * highlighting; Postgres stays the source of truth for which rows match.
 *
 * @example
 * foldSearchText("Função"); // "funcao"
 */
export function foldSearchText(value: string): string {
  // Native lowercasing and a regex pass that only calls back on non-ASCII
  // characters keep this near `toLowerCase()` speed on long note bodies,
  // which global search folds on every render.
  const lower = value.toLowerCase();
  if (lower.length === value.length) {
    return lower.replace(NON_ASCII_CHARACTER, stripCharacterAccents);
  }
  return Array.from(value, foldSearchCharacter).join("");
}

/**
 * Accent- and case-insensitive substring test, matching global search.
 *
 * @example
 * includesFoldedText("Revolução Francesa", "revolucao"); // true
 */
export function includesFoldedText(value: string, query: string): boolean {
  return foldSearchText(value).includes(foldSearchText(query));
}

// Rare path for text whose lowercase changes length (such as "İ").
function foldSearchCharacter(character: string): string {
  const lower = character.toLowerCase();
  return lower.length === character.length
    ? stripCharacterAccents(lower)
    : character;
}

function stripCharacterAccents(character: string): string {
  const stripped = character.normalize("NFD").replaceAll(COMBINING_MARKS, "");
  return stripped.length === character.length ? stripped : character;
}
