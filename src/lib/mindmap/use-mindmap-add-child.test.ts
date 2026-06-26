import type { Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { getSiblingInsertY } from "@/lib/mindmap/use-mindmap-add-child";

describe("getSiblingInsertY", () => {
  it("places the new sibling directly below the selected node", () => {
    const selected = {
      id: "second",
      position: { x: 0, y: 72 },
      data: { label: "Second" },
    } satisfies Node;

    expect(getSiblingInsertY(selected)).toBe(73);
  });
});
