import { z } from "zod";
import { documentNodes } from "@/lib/editor/document";
import { documentFromMarkdown } from "@/lib/editor/document-markdown";

// Edit tools check proposals in code against the draft the model was shown,
// not only through instructions. A failed check makes the tool call invalid;
// the AI SDK returns each message to the model as the call's error, so it can
// correct the proposal in its next step instead of the user reviewing a
// misplaced, repeated, or empty change. Every message reads
// "<problem>; expected <shape>" so the model knows what to send instead.

/** Returns one message per violated rule; empty when the proposal is valid. */
export type EditGuard<Input> = (input: Input) => string[];

// Matches both flashcard ({{IMAGE_0}}) and note ({{NOTE_IMAGE_b1_0}}) placeholders.
const IMAGE_PLACEHOLDER_PATTERN = /\{\{[A-Z_]+\w*\}\}/g;

interface DraftIdentity {
  sessionId: string;
  revision: number;
}

/**
 * Edit tool input object that rejects unknown fields by name. A plain object
 * drops them silently, so a model that put an edit's fields at the top level
 * was told its proposal changed nothing instead of where the fields belong.
 *
 * @example
 * editToolInputObject({ sessionId, revision, front }, "");
 */
export function editToolInputObject<Shape extends z.ZodRawShape>(
  shape: Shape,
  placement: string,
) {
  const expected = `expected only ${Object.keys(shape).join(", ")}${placement}`;
  return z.strictObject(shape, {
    error: (issue) =>
      issue.code === "unrecognized_keys"
        ? `Unknown field ${issue.keys.join(", ")}; ${expected}`
        : undefined,
  });
}

/**
 * Add draft-aware guards to an edit tool's input schema without changing its
 * JSON Schema, so models see the same contract and only the checks are added.
 *
 * @example
 * guardEditSchema(noteEditsInputSchema, [(input) => findProblems(input, draft)]);
 */
export function guardEditSchema<Schema extends z.ZodType>(
  schema: Schema,
  guards: EditGuard<z.output<Schema>>[],
): Schema {
  return schema.superRefine((input, ctx) => {
    for (const message of guards.flatMap((guard) => guard(input)))
      ctx.addIssue({ code: "custom", message });
  }) as Schema;
}

/**
 * Models sometimes copy the session or revision from an older draft in the
 * history; the client would then discard the proposal as stale.
 *
 * @example
 * findDraftIdentityProblems(input, draft); // [] when both match
 */
export function findDraftIdentityProblems(
  input: DraftIdentity,
  draft: DraftIdentity,
): string[] {
  const problems: string[] = [];
  if (input.sessionId !== draft.sessionId)
    problems.push(
      `sessionId ${input.sessionId} is not the current draft; expected ${draft.sessionId}`,
    );
  if (input.revision !== draft.revision)
    problems.push(
      `revision ${input.revision} is not the current draft; expected ${draft.revision}`,
    );
  return problems;
}

/**
 * One message per referenced id missing from the ids the model was shown.
 *
 * @example
 * findUnknownIdProblems("block", ["b9"], ["b0", "b1"]);
 * // ["Unknown block id b9; expected one of b0, b1"]
 */
export function findUnknownIdProblems(
  kind: string,
  referenced: string[],
  known: readonly string[],
): string[] {
  const valid = new Set(known);
  return [...new Set(referenced)]
    .filter((id) => !valid.has(id))
    .map(
      (id) =>
        `Unknown ${kind} id ${id}; ${expectedOneOf(known, `${kind} reference`)}`,
    );
}

/**
 * Whether proposed Markdown keeps the current content, ignoring whitespace.
 *
 * @example
 * isUnchangedMarkdown("- A\n", "- A"); // true
 */
export function isUnchangedMarkdown(
  proposed: string,
  current: string,
): boolean {
  return compactMarkdown(proposed) === compactMarkdown(current);
}

/**
 * Side on which proposed Markdown only adds blocks around the unchanged
 * current Markdown; such a replacement is an insertion and should be proposed
 * as one, so the review does not show kept content as removed and re-added.
 *
 * @example
 * findAddedSide("A\n\nB", "A"); // "after"
 */
export function findAddedSide(
  proposed: string,
  current: string,
): "before" | "after" | undefined {
  const next = markdownBlocks(proposed);
  const kept = markdownBlocks(current);
  if (!kept.length || next.length <= kept.length) return undefined;
  const same = (offset: number) =>
    kept.every((block, index) => next[offset + index] === block);
  if (same(0)) return "after";
  if (same(next.length - kept.length)) return "before";
  return undefined;
}

function markdownBlocks(markdown: string): string[] {
  return markdown
    .split(/\n\s*\n/)
    .map(compactMarkdown)
    .filter(Boolean);
}

// A reworded copy keeps most of the original's words.
const REWORDED_COPY_SHARED_WORDS = 0.8;

/**
 * Whether `candidate` keeps most words of `existing`, a text with at least
 * `minWords` distinct words; shorter texts are too generic to judge.
 *
 * @example
 * repeatsMostWords("The membrane controls what enters cells", "The membrane controls what enters a cell", 6); // true
 */
export function repeatsMostWords(
  existing: string,
  candidate: string,
  minWords: number,
): boolean {
  const words = wordSet(existing);
  if (words.size < minWords) return false;
  const candidateWords = wordSet(candidate);
  const shared = [...words].filter((word) => candidateWords.has(word)).length;
  return shared / words.size >= REWORDED_COPY_SHARED_WORDS;
}

/**
 * Whether two texts use the same words, ignoring case, punctuation, and order.
 *
 * @example
 * hasSameWords("What is ATP?", "what is atp"); // true
 */
export function hasSameWords(first: string, second: string): boolean {
  const left = wordSet(first);
  const right = wordSet(second);
  return (
    left.size > 0 &&
    left.size === right.size &&
    [...left].every((word) => right.has(word))
  );
}

/**
 * Image placeholders the model was shown are the only images it may use;
 * real image tags or attachment URLs would be invented images.
 *
 * @example
 * findImageReferenceProblems("{{IMAGE_3}}", ["{{IMAGE_0}}"]);
 */
export function findImageReferenceProblems(
  markdown: string,
  allowed: readonly string[],
): string[] {
  // Parsed, so image syntax inside code (e.g. a note about HTML) is allowed.
  const invented = documentNodes(documentFromMarkdown(markdown)).some(
    (node) => node.type === "image",
  )
    ? ["Image in Markdown; expected only image placeholders from the draft"]
    : [];
  return [
    ...invented,
    ...imagePlaceholdersIn(markdown).flatMap((placeholder) =>
      placeholderProblems(markdown, placeholder, allowed),
    ),
  ];
}

function placeholderProblems(
  markdown: string,
  placeholder: string,
  allowed: readonly string[],
): string[] {
  if (!allowed.includes(placeholder))
    return [
      `Unknown image placeholder ${placeholder}; ${expectedOneOf(allowed, "image placeholder")}`,
    ];
  if (markdown.split(placeholder).length > 2)
    return [
      `Image placeholder ${placeholder} repeats; expected each image at most once`,
    ];
  return [];
}

/**
 * Image placeholders present in draft Markdown.
 *
 * @example
 * imagePlaceholdersIn("Answer\n\n{{IMAGE_0}}"); // ["{{IMAGE_0}}"]
 */
export function imagePlaceholdersIn(markdown: string): string[] {
  return [...new Set(markdown.match(IMAGE_PLACEHOLDER_PATTERN) ?? [])];
}

function expectedOneOf(values: readonly string[], noun: string): string {
  return values.length > 0
    ? `expected one of ${values.join(", ")}`
    : `expected no ${noun}`;
}

function wordSet(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

/**
 * Markdown with whitespace collapsed, for content comparisons.
 *
 * @example
 * compactMarkdown("- A\n- B "); // "- A - B"
 */
export function compactMarkdown(markdown: string): string {
  return markdown.replaceAll(/\s+/g, " ").trim();
}
