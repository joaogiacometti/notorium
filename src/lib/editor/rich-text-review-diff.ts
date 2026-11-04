import { ChangeSet, type TokenEncoder } from "@tiptap/pm/changeset";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Slice } from "@tiptap/pm/model";
import { ReplaceStep } from "@tiptap/pm/transform";

/** Below this word overlap, two blocks read as a rewrite rather than an edit. */
const MIN_BLOCK_SIMILARITY = 0.5;
const IDENTICAL_BLOCK_SCORE = 2;
const MAX_ALIGNED_PAIRS = 40_000;
const WORD_CHARACTER = /[\p{L}\p{N}_]/u;
const WORDS = /[\p{L}\p{N}_]+/gu;
const INLINE_LEAF = "￼";

export interface ReviewHunk {
  fromA: number;
  toA: number;
  fromB: number;
  toB: number;
}

export interface ReviewDiff {
  hunks: ReviewHunk[];
  /** Proposed nodes whose attributes changed, such as a heading level. */
  changedNodes: { pos: number; node: ProseMirrorNode }[];
}

/** Counts marks and attributes as content, so formatting-only edits stay reviewable. */
const reviewTokenEncoder: TokenEncoder<number | string> = {
  encodeCharacter: (char, marks) =>
    marks.length ? `${char}:${JSON.stringify(marks)}` : char,
  encodeNodeStart: (node) => `${node.type.name}:${JSON.stringify(node.attrs)}`,
  encodeNodeEnd: (node) => `/${node.type.name}`,
  compareTokens: (a, b) => a === b,
};

/** Match similar blocks first, so text is only compared within a matched block.
 * @example computeReviewDiff(originalDoc, proposedDoc).hunks;
 */
export function computeReviewDiff(
  original: ProseMirrorNode,
  proposed: ProseMirrorNode,
): ReviewDiff {
  const diff: ReviewDiff = { hunks: [], changedNodes: [] };
  // The live editor owns its own schema, and node equality is schema-bound.
  const comparable = proposed.type.schema.nodeFromJSON(original.toJSON());
  diffChildren(comparable, proposed, 0, 0, diff);
  return diff;
}

function diffChildren(
  original: ProseMirrorNode,
  proposed: ProseMirrorNode,
  startA: number,
  startB: number,
  diff: ReviewDiff,
) {
  const positionsA = childPositions(original, startA);
  const positionsB = childPositions(proposed, startB);
  let indexA = 0;
  let indexB = 0;
  for (const [pairA, pairB] of [
    ...alignChildren(original, proposed),
    [original.childCount, proposed.childCount],
  ]) {
    if (pairA > indexA || pairB > indexB)
      diff.hunks.push({
        fromA: positionsA[indexA],
        toA: positionsA[pairA],
        fromB: positionsB[indexB],
        toB: positionsB[pairB],
      });
    if (pairA < original.childCount)
      diffPair(
        original.child(pairA),
        proposed.child(pairB),
        positionsA[pairA],
        positionsB[pairB],
        diff,
      );
    indexA = pairA + 1;
    indexB = pairB + 1;
  }
}

function childPositions(parent: ProseMirrorNode, start: number): number[] {
  const positions = [start];
  parent.forEach((child) => {
    positions.push((positions.at(-1) ?? start) + child.nodeSize);
  });
  return positions;
}

function diffPair(
  a: ProseMirrorNode,
  b: ProseMirrorNode,
  posA: number,
  posB: number,
  diff: ReviewDiff,
) {
  if (a.eq(b)) return;
  if (JSON.stringify(a.attrs) !== JSON.stringify(b.attrs))
    diff.changedNodes.push({ pos: posB, node: b });
  if (a.isTextblock) {
    for (const hunk of diffInlineContent(a, b))
      diff.hunks.push({
        fromA: hunk.fromA + posA + 1,
        toA: hunk.toA + posA + 1,
        fromB: hunk.fromB + posB + 1,
        toB: hunk.toB + posB + 1,
      });
    return;
  }
  diffChildren(a, b, posA + 1, posB + 1, diff);
}

/** The highest-scoring in-order pairing of children, by longest common subsequence. */
function alignChildren(
  original: ProseMirrorNode,
  proposed: ProseMirrorNode,
): [number, number][] {
  const rows = original.childCount;
  const columns = proposed.childCount;
  if (rows * columns > MAX_ALIGNED_PAIRS) return [];
  const wordsB = proposed.content.content.map(blockWords);
  const scores = original.content.content.map((a) => {
    const wordsA = blockWords(a);
    return proposed.content.content.map((b, column) =>
      pairScore(a, b, wordsA, wordsB[column]),
    );
  });
  const best = Array.from({ length: rows + 1 }, () =>
    new Array<number>(columns + 1).fill(0),
  );
  for (let row = rows - 1; row >= 0; row--) {
    for (let column = columns - 1; column >= 0; column--) {
      const score = scores[row][column];
      best[row][column] = Math.max(
        best[row + 1][column],
        best[row][column + 1],
        score ? score + best[row + 1][column + 1] : 0,
      );
    }
  }
  const pairs: [number, number][] = [];
  let row = 0;
  let column = 0;
  while (row < rows && column < columns) {
    const score = scores[row][column];
    if (score && best[row][column] === score + best[row + 1][column + 1]) {
      pairs.push([row++, column++]);
    } else if (best[row + 1][column] >= best[row][column + 1]) {
      row++;
    } else {
      column++;
    }
  }
  return pairs;
}

function pairScore(
  a: ProseMirrorNode,
  b: ProseMirrorNode,
  wordsA: Set<string>,
  wordsB: Set<string>,
): number {
  if (a.eq(b)) return IDENTICAL_BLOCK_SCORE;
  if (a.type !== b.type || a.isLeaf) return 0;
  const similarity = wordSimilarity(wordsA, wordsB);
  return similarity >= MIN_BLOCK_SIMILARITY ? similarity : 0;
}

function blockWords(node: ProseMirrorNode): Set<string> {
  return new Set(node.textContent.toLocaleLowerCase().match(WORDS) ?? []);
}

function wordSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  const shared = [...a].filter((word) => b.has(word)).length;
  return (2 * shared) / (a.size + b.size);
}

function diffInlineContent(
  a: ProseMirrorNode,
  b: ProseMirrorNode,
): ReviewHunk[] {
  const replaceAll = new ReplaceStep(
    0,
    a.content.size,
    new Slice(b.content, 0, 0),
  );
  const { changes } = ChangeSet.create(
    a,
    undefined,
    reviewTokenEncoder,
  ).addSteps(b, [replaceAll.getMap()], null);
  return expandToWords(
    changes,
    a.textBetween(0, a.content.size, "", INLINE_LEAF),
    b.textBetween(0, b.content.size, "", INLINE_LEAF),
  );
}

/** A partly highlighted word is harder to read than a replaced one. */
function expandToWords(
  changes: readonly ReviewHunk[],
  textA: string,
  textB: string,
): ReviewHunk[] {
  const hunks: ReviewHunk[] = [];
  changes.forEach((change, index) => {
    const next = changes[index + 1];
    const previous = hunks.at(-1);
    let { fromA, toA, fromB, toB } = change;
    if (
      isWord(textA[fromA], fromA < toA) ||
      isWord(textB[fromB], fromB < toB)
    ) {
      while (
        fromA > (previous?.toA ?? 0) &&
        fromB > (previous?.toB ?? 0) &&
        isWord(textA[fromA - 1])
      ) {
        fromA--;
        fromB--;
      }
    }
    if (
      isWord(textA[toA - 1], fromA < toA) ||
      isWord(textB[toB - 1], fromB < toB)
    ) {
      while (
        toA < (next?.fromA ?? textA.length) &&
        toB < (next?.fromB ?? textB.length) &&
        isWord(textA[toA])
      ) {
        toA++;
        toB++;
      }
    }
    if (previous && (fromA <= previous.toA || fromB <= previous.toB)) {
      previous.toA = toA;
      previous.toB = toB;
    } else {
      hunks.push({ fromA, toA, fromB, toB });
    }
  });
  return hunks;
}

function isWord(character: string | undefined, present = true): boolean {
  return present && character !== undefined && WORD_CHARACTER.test(character);
}
