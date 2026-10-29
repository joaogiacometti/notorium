import { describe, expect, it } from "vitest";
import { getFlashcardsManageOrderBy } from "@/features/flashcards/queries";

function getSqlChunkText(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("queryChunks" in value)
  ) {
    return "";
  }

  return (value as { queryChunks: unknown[] }).queryChunks
    .map((chunk) => {
      if (typeof chunk === "string") {
        return chunk;
      }

      if (
        typeof chunk === "object" &&
        chunk !== null &&
        "value" in chunk &&
        Array.isArray(chunk.value)
      ) {
        return chunk.value.join("");
      }

      return "";
    })
    .join(" ");
}

describe("getFlashcardsManageOrderBy", () => {
  it("ranks front matches before back and deck matches when searching", () => {
    const orderBy = getFlashcardsManageOrderBy("PERT", "%PERT%");

    expect(orderBy).toHaveLength(2);
    expect(getSqlChunkText(orderBy[0])).toContain("then 0");
    expect(getSqlChunkText(orderBy[0])).toContain("then 1");
    expect(getSqlChunkText(orderBy[0])).toContain("then 2");
  });

  it("keeps updated-at ordering for empty search", () => {
    expect(getFlashcardsManageOrderBy("", "%%")).toHaveLength(1);
  });
});
