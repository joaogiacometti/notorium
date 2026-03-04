import { describe, expect, it } from "vitest";
import type { FlashcardEntity } from "@/lib/api/contracts";
import { scheduleFlashcardReview } from "@/lib/flashcard-scheduler";

const now = new Date("2026-03-04T12:00:00.000Z");

type SchedulerCard = Pick<
  FlashcardEntity,
  | "state"
  | "ease"
  | "intervalDays"
  | "learningStep"
  | "reviewCount"
  | "lapseCount"
>;

function makeCard(overrides: Partial<SchedulerCard> = {}): SchedulerCard {
  return {
    state: "new",
    ease: 250,
    intervalDays: 0,
    learningStep: 0,
    reviewCount: 0,
    lapseCount: 0,
    ...overrides,
  };
}

describe("scheduleFlashcardReview", () => {
  it("moves new card to first learning step on again", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({ state: "new" }),
      grade: "again",
      now,
    });

    expect(result.state).toBe("learning");
    expect(result.learningStep).toBe(0);
    expect(result.dueAt.toISOString()).toBe("2026-03-04T12:01:00.000Z");
  });

  it("advances learning card to next step on good", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({ state: "learning", learningStep: 0 }),
      grade: "good",
      now,
    });

    expect(result.state).toBe("learning");
    expect(result.learningStep).toBe(1);
    expect(result.dueAt.toISOString()).toBe("2026-03-04T12:10:00.000Z");
  });

  it("graduates learning card after final step on good", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({ state: "learning", learningStep: 1 }),
      grade: "good",
      now,
    });

    expect(result.state).toBe("review");
    expect(result.intervalDays).toBe(1);
    expect(result.learningStep).toBeNull();
    expect(result.dueAt.toISOString()).toBe("2026-03-05T12:00:00.000Z");
  });

  it("graduates immediately on easy during learning", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({ state: "learning", learningStep: 0 }),
      grade: "easy",
      now,
    });

    expect(result.state).toBe("review");
    expect(result.intervalDays).toBe(4);
    expect(result.dueAt.toISOString()).toBe("2026-03-08T12:00:00.000Z");
  });

  it("applies hard factor and decreases ease for review cards", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({ state: "review", intervalDays: 10, ease: 250 }),
      grade: "hard",
      now,
    });

    expect(result.state).toBe("review");
    expect(result.ease).toBe(235);
    expect(result.intervalDays).toBe(12);
    expect(result.dueAt.toISOString()).toBe("2026-03-16T12:00:00.000Z");
  });

  it("applies ease multiplier for good on review cards", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({ state: "review", intervalDays: 10, ease: 250 }),
      grade: "good",
      now,
    });

    expect(result.ease).toBe(250);
    expect(result.intervalDays).toBe(25);
    expect(result.dueAt.toISOString()).toBe("2026-03-29T12:00:00.000Z");
  });

  it("applies easy bonus and increases ease on review cards", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({ state: "review", intervalDays: 10, ease: 250 }),
      grade: "easy",
      now,
    });

    expect(result.ease).toBe(265);
    expect(result.intervalDays).toBe(32);
    expect(result.dueAt.toISOString()).toBe("2026-04-05T12:00:00.000Z");
  });

  it("moves review card to relearning on again", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({ state: "review", intervalDays: 30, ease: 250 }),
      grade: "again",
      now,
    });

    expect(result.state).toBe("relearning");
    expect(result.ease).toBe(230);
    expect(result.intervalDays).toBe(1);
    expect(result.learningStep).toBe(0);
    expect(result.lapseCount).toBe(1);
    expect(result.dueAt.toISOString()).toBe("2026-03-04T12:10:00.000Z");
  });

  it("graduates relearning card on good", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({
        state: "relearning",
        intervalDays: 3,
        learningStep: 0,
      }),
      grade: "good",
      now,
    });

    expect(result.state).toBe("review");
    expect(result.intervalDays).toBe(3);
    expect(result.learningStep).toBeNull();
    expect(result.dueAt.toISOString()).toBe("2026-03-07T12:00:00.000Z");
  });

  it("never reduces ease below minimum", () => {
    const result = scheduleFlashcardReview({
      card: makeCard({ state: "review", intervalDays: 10, ease: 130 }),
      grade: "again",
      now,
    });

    expect(result.ease).toBe(130);
  });
});
