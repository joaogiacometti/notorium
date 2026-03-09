import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/config/limits";
import {
  formatSubjectCount,
  getSubjectCountWithLimitText,
  getTotalSubjectCount,
} from "./subjects-count";

describe("subjects-count", () => {
  describe("getTotalSubjectCount", () => {
    it("should sum active and archived counts", () => {
      expect(getTotalSubjectCount(0, 0)).toBe(0);
      expect(getTotalSubjectCount(5, 0)).toBe(5);
      expect(getTotalSubjectCount(0, 3)).toBe(3);
      expect(getTotalSubjectCount(5, 2)).toBe(7);
    });
  });

  describe("formatSubjectCount", () => {
    it("should format 0 subjects", () => {
      expect(formatSubjectCount(0)).toBe("0 subjects");
    });

    it("should format 1 subject", () => {
      expect(formatSubjectCount(1)).toBe("1 subject");
    });

    it("should format multiple subjects", () => {
      expect(formatSubjectCount(5)).toBe("5 subjects");
      expect(formatSubjectCount(10)).toBe("10 subjects");
    });
  });

  describe("getSubjectCountWithLimitText", () => {
    it("should return empty state text when there are 0 total subjects", () => {
      expect(getSubjectCountWithLimitText(0, 0)).toBe("No subjects yet");
    });

    it("should format active count and append total limit indication", () => {
      expect(getSubjectCountWithLimitText(5, 0)).toBe(
        `5 subjects (5/${LIMITS.maxSubjects} total)`,
      );
    });

    it("should include archived subjects in the total count calculation", () => {
      expect(getSubjectCountWithLimitText(3, 2)).toBe(
        `3 subjects (5/${LIMITS.maxSubjects} total)`,
      );
    });

    it("should handle formatting correctly at precisely the global limit", () => {
      expect(getSubjectCountWithLimitText(LIMITS.maxSubjects, 0)).toBe(
        `${LIMITS.maxSubjects} subjects (${LIMITS.maxSubjects}/${LIMITS.maxSubjects} total)`,
      );
    });
  });
});
