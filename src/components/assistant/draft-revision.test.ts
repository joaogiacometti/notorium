import { describe, expect, it } from "vitest";
import { createDraftRevisionCounter } from "@/components/assistant/draft-revision";

describe("createDraftRevisionCounter", () => {
  it("bumps only when the content signature changes", () => {
    const nextRevision = createDraftRevisionCounter(3);
    expect(nextRevision("a")).toBe(3);
    expect(nextRevision("a")).toBe(3);
    expect(nextRevision("b")).toBe(4);
  });
});
