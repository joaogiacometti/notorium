import { describe, expect, it } from "vitest";
import { getScoreTone } from "@/lib/status-tones";

describe("getScoreTone", () => {
  it("returns 'success' for scores >= 70", () => {
    expect(getScoreTone(70)).toBe("success");
    expect(getScoreTone(85)).toBe("success");
    expect(getScoreTone(100)).toBe("success");
  });

  it("returns 'warning' for scores >= 50 and < 70", () => {
    expect(getScoreTone(50)).toBe("warning");
    expect(getScoreTone(60)).toBe("warning");
    expect(getScoreTone(69)).toBe("warning");
  });

  it("returns 'danger' for scores < 50", () => {
    expect(getScoreTone(0)).toBe("danger");
    expect(getScoreTone(25)).toBe("danger");
    expect(getScoreTone(49)).toBe("danger");
  });
});
