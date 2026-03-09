import { extname } from "node:path";
import type { AnkiImportCard } from "@/features/flashcards/anki-import-validation";
import { getInitialFlashcardSchedulingState } from "@/features/flashcards/fsrs";

const textExtensions = new Set([".txt"]);

function toFsrsNumeric(value: number | null | undefined, fallback: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return value.toFixed(4);
}

function toSafeDate(value: string | null | undefined, fallback: Date | null) {
  if (value === undefined) {
    return fallback;
  }

  if (value === null) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function toSafeNonNegativeInteger(
  value: number | null | undefined,
  fallback: number | null,
) {
  if (value === undefined) {
    return fallback;
  }

  if (value === null) {
    return null;
  }

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

function detectTextSeparator(source: string) {
  const headerLines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("#separator:"));

  const declared = headerLines[0]?.slice("#separator:".length).trim();

  switch (declared?.toLowerCase()) {
    case "tab":
      return "\t";
    case "semicolon":
      return ";";
    case "comma":
      return ",";
    case "pipe":
      return "|";
    case "colon":
      return ":";
    case "space":
      return " ";
    default:
      return "\t";
  }
}

function parseDelimitedLine(line: string, separator: string) {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index++;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === separator && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  fields.push(current);
  return fields;
}

export function parseAnkiTextExport(source: string): AnkiImportCard[] {
  const separator = detectTextSeparator(source);
  const lines = source
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const cards: AnkiImportCard[] = [];

  for (const line of lines) {
    const fields = parseDelimitedLine(line, separator);
    const front = fields[0]?.trim();
    const back = fields[1]?.trim();

    if (!front || !back) {
      continue;
    }

    cards.push({ front, back });
  }

  return cards;
}

export async function parseAnkiImportFile(
  file: File,
): Promise<AnkiImportCard[]> {
  const extension = extname(file.name).toLowerCase();

  if (!textExtensions.has(extension)) {
    throw new Error("invalid-format");
  }

  return parseAnkiTextExport(await file.text());
}

export function mapAnkiImportCardToFlashcardInsert(
  card: AnkiImportCard,
  now: Date = new Date(),
) {
  const initialState = getInitialFlashcardSchedulingState(now);

  return {
    front: card.front,
    back: card.back,
    state: card.state ?? initialState.state,
    dueAt: toSafeDate(card.dueAt, initialState.dueAt) ?? initialState.dueAt,
    stability: toFsrsNumeric(card.stability, initialState.stability),
    difficulty: toFsrsNumeric(card.difficulty, initialState.difficulty),
    ease: card.ease ?? initialState.ease,
    intervalDays:
      toSafeNonNegativeInteger(card.intervalDays, initialState.intervalDays) ??
      initialState.intervalDays,
    learningStep:
      toSafeNonNegativeInteger(card.learningStep, initialState.learningStep) ??
      null,
    lastReviewedAt:
      toSafeDate(card.lastReviewedAt, initialState.lastReviewedAt) ?? null,
    reviewCount:
      toSafeNonNegativeInteger(card.reviewCount, initialState.reviewCount) ??
      initialState.reviewCount,
    lapseCount:
      toSafeNonNegativeInteger(card.lapseCount, initialState.lapseCount) ??
      initialState.lapseCount,
    updatedAt: now,
  };
}
