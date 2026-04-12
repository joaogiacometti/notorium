import { describe, expect, it } from "vitest";
import { importDataSchema } from "@/features/data-transfer/validation";
import { LIMITS } from "@/lib/config/limits";

const validAssessment = {
  title: "Midterm",
  description: null,
  type: "exam",
  status: "pending",
  dueDate: null,
  score: null,
  weight: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const validNote = {
  title: "Lecture 1",
  content: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const validSubject = {
  name: "Mathematics",
  description: null,
  totalClasses: null,
  maxMisses: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  notes: [],
  attendanceMisses: [],
  assessments: [],
  flashcards: [],
};

const validDeck = {
  name: "Lecture Notes",
  description: null,
  isDefault: false,
};

const validPayload = {
  version: 1,
  exportedAt: "2026-03-01T00:00:00.000Z",
  flashcardScheduler: {
    desiredRetention: 0.9,
    weights: Array.from({ length: 21 }, (_, index) => index + 1),
  },
  subjects: [],
};

const validFlashcard = {
  front: "Question",
  back: "Answer",
  state: "new",
  dueAt: "2026-01-02T00:00:00.000Z",
  stability: null,
  difficulty: null,
  ease: 250,
  intervalDays: 0,
  learningStep: null,
  lastReviewedAt: null,
  reviewCount: 0,
  lapseCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("importDataSchema", () => {
  it("accepts a minimal valid payload (no subjects)", () => {
    const result = importDataSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  it("accepts a full subject with notes, assessments, attendance, decks, and flashcards", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          notes: [validNote],
          assessments: [validAssessment],
          attendanceMisses: [{ missDate: "2026-02-10" }],
          decks: [validDeck],
          flashcards: [{ ...validFlashcard, deckName: "Lecture Notes" }],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts a flashcard without deckName (backward-compatible)", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          flashcards: [validFlashcard],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an unsupported version number", () => {
    const result = importDataSchema.safeParse({ ...validPayload, version: 99 });

    expect(result.success).toBe(false);
  });

  it("rejects subject with empty name", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [{ ...validSubject, name: "" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects note with empty title", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          notes: [{ ...validNote, title: "" }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects assessment with invalid type", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          assessments: [{ ...validAssessment, type: "quiz" }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects assessment with invalid status", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          assessments: [{ ...validAssessment, status: "cancelled" }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects flashcard with empty front", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          flashcards: [{ ...validFlashcard, front: "" }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects notes with too many internal attachments", () => {
    const content = Array.from(
      { length: LIMITS.maxAttachmentsPerNote + 1 },
      (_, index) =>
        `<img src="/api/attachments/blob?pathname=notorium%2Fnotes%2Fuser-1%2F${index}.png">`,
    ).join("");

    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          notes: [{ ...validNote, content }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects flashcards with too many internal attachments", () => {
    const front = Array.from(
      { length: LIMITS.maxAttachmentsPerFlashcard },
      (_, index) =>
        `<img src="/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Ffront-${index}.png">`,
    ).join("");

    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          flashcards: [
            {
              ...validFlashcard,
              front,
              back: '<img src="/api/attachments/blob?pathname=notorium%2Fflashcards%2Fuser-1%2Foverflow.png">',
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing exportedAt", () => {
    const { exportedAt: _, ...rest } = validPayload;
    const result = importDataSchema.safeParse(rest);

    expect(result.success).toBe(false);
  });

  it("defaults missing flashcards array to empty", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          flashcards: undefined,
        },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.subjects[0]?.flashcards).toEqual([]);
  });

  it("rejects flashcards with invalid scheduling dates", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          flashcards: [{ ...validFlashcard, dueAt: "not-a-date" }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects flashcards with non-finite scheduling numbers", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          flashcards: [{ ...validFlashcard, stability: Number.NaN }],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects flashcards with negative counters and intervals", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      subjects: [
        {
          ...validSubject,
          flashcards: [
            {
              ...validFlashcard,
              intervalDays: -1,
              reviewCount: -1,
              lapseCount: -1,
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects scheduler settings with non-finite values", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      flashcardScheduler: {
        desiredRetention: Number.NaN,
        weights: [1, Number.POSITIVE_INFINITY],
      },
    });

    expect(result.success).toBe(false);
  });

  it("strips unexpected ai settings fields from imported payloads", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      userAiSettings: {
        provider: "openrouter",
        model: "openai/gpt-4.1-mini",
        apiKey: "sk-or-v1-should-not-import",
      },
      subjects: [
        {
          ...validSubject,
          aiSettings: {
            provider: "openrouter",
          },
        },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect("userAiSettings" in result.data).toBe(false);
    expect("aiSettings" in (result.data.subjects[0] ?? {})).toBe(false);
  });

  it("strips account and security fields from imported payloads", () => {
    const result = importDataSchema.safeParse({
      ...validPayload,
      session: {
        token: "session-token",
      },
      account: {
        providerId: "openrouter",
        accessToken: "access-token",
      },
      verification: {
        value: "verification-secret",
      },
      email: "user@example.com",
      name: "User Name",
      subjects: [
        {
          ...validSubject,
          token: "nested-secret",
          email: "nested@example.com",
          notes: [
            {
              ...validNote,
              password: "note-secret",
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect("session" in result.data).toBe(false);
    expect("account" in result.data).toBe(false);
    expect("verification" in result.data).toBe(false);
    expect("email" in result.data).toBe(false);
    expect("name" in result.data).toBe(false);
    expect("token" in (result.data.subjects[0] ?? {})).toBe(false);
    expect("email" in (result.data.subjects[0] ?? {})).toBe(false);
    expect("password" in (result.data.subjects[0]?.notes[0] ?? {})).toBe(false);
  });
});
