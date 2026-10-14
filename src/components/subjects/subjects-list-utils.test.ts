import { describe, expect, it } from "vitest";
import {
  getSelectedSubjects,
  getSubjectPageItems,
  getVisibleSubjects,
} from "@/components/subjects/subjects-list-utils";
import type { SubjectListItem } from "@/lib/server/api-contracts";

function makeSubject(
  overrides: Partial<SubjectListItem> & Pick<SubjectListItem, "id" | "name">,
): SubjectListItem {
  return {
    kind: "academic",
    totalClasses: null,
    maxMisses: null,
    parentSubjectId: null,
    userId: "user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    notesCount: 0,
    ...overrides,
  };
}

const active = makeSubject({
  id: "a",
  name: "Biology",
  updatedAt: new Date("2024-03-01"),
});
const recent = makeSubject({
  id: "b",
  name: "Algebra",
  updatedAt: new Date("2024-05-01"),
});

describe("getVisibleSubjects", () => {
  const all = [active, recent];

  it("sorts by updatedDesc by default", () => {
    const result = getVisibleSubjects(all, "", "updatedDesc");
    expect(result.map((subject) => subject.id)).toEqual(["b", "a"]);
  });

  it("filters by case-insensitive name search", () => {
    const result = getVisibleSubjects(all, "bio", "updatedDesc");
    expect(result.map((subject) => subject.id)).toEqual(["a"]);
  });

  it("sorts by name ascending when requested", () => {
    const result = getVisibleSubjects(all, "", "nameAsc");
    expect(result.map((subject) => subject.name)).toEqual([
      "Algebra",
      "Biology",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [active, recent];
    getVisibleSubjects(input, "", "nameAsc");
    expect(input).toEqual([active, recent]);
  });
});

describe("getSelectedSubjects", () => {
  it("returns subjects whose ids are selected", () => {
    const result = getSelectedSubjects([active, recent], ["a", "b"]);
    expect(result.map((subject) => subject.id)).toEqual(["a", "b"]);
  });
});

describe("getSubjectPageItems", () => {
  const items = [active, recent];

  it("slices the page window", () => {
    expect(getSubjectPageItems(items, 0, 1)).toEqual([active]);
    expect(getSubjectPageItems(items, 1, 1)).toEqual([recent]);
  });
});
