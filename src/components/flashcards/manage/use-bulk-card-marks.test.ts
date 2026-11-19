import { describe, expect, it } from "vitest";
import { resolveBulkMarkIntents } from "@/components/flashcards/manage/use-bulk-card-marks";

const marked = new Date("2026-11-18T10:00:00.000Z");

function card(
  id: string,
  { studyLater = false, archived = false } = {},
): { id: string; studyLaterAt: Date | null; archivedAt: Date | null } {
  return {
    id,
    studyLaterAt: studyLater ? marked : null,
    archivedAt: archived ? marked : null,
  };
}

describe("resolveBulkMarkIntents", () => {
  it("marks and archives a selection that does not all have them yet", () => {
    expect(
      resolveBulkMarkIntents([card("a", { studyLater: true }), card("b")]),
    ).toEqual({ studyLater: "mark", archive: "archive" });
  });

  it("clears study later when every active selected card is marked", () => {
    expect(
      resolveBulkMarkIntents([
        card("a", { studyLater: true }),
        card("b", { archived: true }),
      ]).studyLater,
    ).toBe("clear");
  });

  it("unarchives when every selected card is archived, and offers no study later", () => {
    expect(
      resolveBulkMarkIntents([
        card("a", { archived: true }),
        card("b", { archived: true }),
      ]),
    ).toEqual({ studyLater: null, archive: "unarchive" });
  });
});
