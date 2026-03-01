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
    expect(limits.maxImageStorageMb).toBeNull();
    expect(limits.imagesAllowed).toBe(true);
  });

  it("free plan disallows images", () => {
    expect(getPlanLimits("free").imagesAllowed).toBe(false);
  });

  it("pro plan allows images", () => {
    expect(getPlanLimits("pro").imagesAllowed).toBe(true);
  });
});
