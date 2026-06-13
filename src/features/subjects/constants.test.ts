import { describe, expect, it } from "vitest";
import {
  getSubjectKindDescription,
  getSubjectKindLabel,
  isAcademicSubject,
  subjectKindValues,
} from "@/features/subjects/constants";

describe("subject kind helpers", () => {
  it("exposes both kinds", () => {
    expect(subjectKindValues).toEqual(["academic", "general"]);
  });

  it("labels each kind", () => {
    expect(getSubjectKindLabel("academic")).toBe("Academic");
    expect(getSubjectKindLabel("general")).toBe("General");
  });

  it("describes each kind", () => {
    expect(getSubjectKindDescription("academic")).toContain("attendance");
    expect(getSubjectKindDescription("general")).toContain("mindmaps");
  });

  it("treats only academic subjects as academic", () => {
    expect(isAcademicSubject("academic")).toBe(true);
    expect(isAcademicSubject("general")).toBe(false);
  });
});
