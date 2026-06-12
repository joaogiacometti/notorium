import { describe, expect, it } from "vitest";
import {
  getSelectedSubjects,
  getSubjectPageItems,
  getSubjectsHref,
  getVisibleSubjects,
  isArchived,
} from "@/components/subjects/subjects-list-utils";
import type { SubjectListItem } from "@/lib/server/api-contracts";

function makeSubject(
  overrides: Partial<SubjectListItem> & Pick<SubjectListItem, "id" | "name">,
): SubjectListItem {
  return {
    totalClasses: null,
    maxMisses: null,
    archivedAt: null,
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
const archived = makeSubject({
  id: "c",
  name: "Chemistry",
  archivedAt: new Date("2024-04-01"),
});

describe("isArchived", () => {
  it("is true only when archivedAt is set", () => {
    expect(isArchived(archived)).toBe(true);
    expect(isArchived(active)).toBe(false);
  });
});

describe("getVisibleSubjects", () => {
  const all = [active, recent, archived];

  it("returns only active subjects for the active filter", () => {
    const result = getVisibleSubjects(all, "active", "", "updatedDesc");
    expect(result.map((subject) => subject.id)).toEqual(["b", "a"]);
  });

  it("returns only archived subjects for the archived filter", () => {
    const result = getVisibleSubjects(all, "archived", "", "updatedDesc");
    expect(result.map((subject) => subject.id)).toEqual(["c"]);
  });

  it("filters by case-insensitive name search", () => {
    const result = getVisibleSubjects(all, "active", "bio", "updatedDesc");
    expect(result.map((subject) => subject.id)).toEqual(["a"]);
  });

  it("sorts by name ascending when requested", () => {
    const result = getVisibleSubjects(all, "active", "", "nameAsc");
    expect(result.map((subject) => subject.name)).toEqual([
      "Algebra",
      "Biology",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [active, recent];
    getVisibleSubjects(input, "active", "", "nameAsc");
    expect(input).toEqual([active, recent]);
  });
});

describe("getSelectedSubjects", () => {
  it("returns subjects whose ids are selected", () => {
    const result = getSelectedSubjects([active, recent, archived], ["a", "c"]);
    expect(result.map((subject) => subject.id)).toEqual(["a", "c"]);
  });
});

describe("getSubjectPageItems", () => {
  const items = [active, recent, archived];

  it("slices the page window", () => {
    expect(getSubjectPageItems(items, 0, 2)).toEqual([active, recent]);
    expect(getSubjectPageItems(items, 1, 2)).toEqual([archived]);
  });
});

describe("getSubjectsHref", () => {
  it("omits the query string for the active status", () => {
    expect(getSubjectsHref("active")).toBe("/subjects");
  });

  it("encodes the status for archived", () => {
    expect(getSubjectsHref("archived")).toBe("/subjects?status=archived");
  });
});
