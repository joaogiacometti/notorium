import { describe, expect, it } from "vitest";
import { resolveScopedSubjectId } from "@/features/flashcards/scope";

const subjects = [{ id: "subject-1" }, { id: "subject-2" }];

describe("resolveScopedSubjectId", () => {
  it("keeps an id that belongs to the user's subjects", () => {
    expect(resolveScopedSubjectId(subjects, "subject-2")).toBe("subject-2");
  });

  it("drops an unknown id", () => {
    expect(resolveScopedSubjectId(subjects, "other-user-subject")).toBe(
      undefined,
    );
  });

  it("returns undefined when no id is given", () => {
    expect(resolveScopedSubjectId(subjects, undefined)).toBe(undefined);
  });
});
