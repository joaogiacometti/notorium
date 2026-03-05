import { describe, expect, it } from "vitest";
import { FREE_LIMITS, getPlanLimits, PRO_LIMITS } from "@/lib/plan-limits";

describe("getPlanLimits", () => {
  it("returns FREE_LIMITS for 'free' plan", () => {
    expect(getPlanLimits("free")).toEqual(FREE_LIMITS);
  });

  it("returns PRO_LIMITS for 'pro' plan", () => {
    expect(getPlanLimits("pro")).toEqual(PRO_LIMITS);
  });

  it("returns null limits for 'unlimited' plan", () => {
    const limits = getPlanLimits("unlimited");

    expect(limits.maxSubjects).toBeNull();
    expect(limits.maxNotesPerSubject).toBeNull();
    expect(limits.maxAssessmentsPerSubject).toBeNull();
    expect(limits.maxFlashcardsPerSubject).toBeNull();
    expect(limits.flashcardsAllowed).toBe(true);
  });

  it("free plan disallows flashcards", () => {
    expect(getPlanLimits("free").flashcardsAllowed).toBe(false);
  });

  it("pro plan allows flashcards", () => {
    expect(getPlanLimits("pro").flashcardsAllowed).toBe(true);
  });

  it("pro plan allows up to 500 flashcards per subject", () => {
    expect(getPlanLimits("pro").maxFlashcardsPerSubject).toBe(500);
  });
});
