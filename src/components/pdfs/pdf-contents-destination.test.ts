import type { RefProxy } from "pdfjs-dist/types/src/display/api";
import { describe, expect, it } from "vitest";
import { resolvePdfContentsPage } from "@/components/pdfs/pdf-contents-destination";

class FakeContentsDocument {
  numPages = 30;

  async getDestination(name: string): Promise<unknown[] | null> {
    return name === "chapter" ? [{ num: 42, gen: 0 }, { name: "Fit" }] : null;
  }

  async getPageIndex(reference: RefProxy): Promise<number> {
    if (reference.num !== 42) throw new Error("Unknown fake page reference");
    return 19;
  }
}

describe("resolvePdfContentsPage", () => {
  it("resolves a zero-based explicit page destination", async () => {
    await expect(
      resolvePdfContentsPage(new FakeContentsDocument(), [19, { name: "Fit" }]),
    ).resolves.toBe(20);
  });

  it("resolves named destinations and PDF page references", async () => {
    await expect(
      resolvePdfContentsPage(new FakeContentsDocument(), "chapter"),
    ).resolves.toBe(20);
    await expect(
      resolvePdfContentsPage(new FakeContentsDocument(), [{ num: 42, gen: 0 }]),
    ).resolves.toBe(20);
  });

  it.each([null, [], "missing", [-1], [30], [1.5], [{ num: "42", gen: 0 }]])(
    "rejects invalid or missing destination %j",
    async (destination) => {
      await expect(
        resolvePdfContentsPage(new FakeContentsDocument(), destination),
      ).rejects.toThrow();
    },
  );

  it("surfaces page lookup failures", async () => {
    await expect(
      resolvePdfContentsPage(new FakeContentsDocument(), [{ num: 99, gen: 0 }]),
    ).rejects.toThrow("Unknown fake page reference");
  });
});
