import { describe, expect, it } from "vitest";
import { findProposedSubjectId } from "@/features/assistant/utils";

const subjects = [
  { id: "bio", path: "Biology" },
  { id: "cells", path: "Biology::Cells" },
];

describe("findProposedSubjectId", () => {
  it("matches an exact path", () => {
    expect(findProposedSubjectId(subjects, "Biology::Cells")).toBe("cells");
  });

  it("matches ignoring case and spacing around separators", () => {
    expect(findProposedSubjectId(subjects, " biology :: CELLS")).toBe("cells");
  });

  it("returns null for a missing or unknown path", () => {
    expect(findProposedSubjectId(subjects, undefined)).toBeNull();
    expect(findProposedSubjectId(subjects, "Chemistry")).toBeNull();
  });
});
