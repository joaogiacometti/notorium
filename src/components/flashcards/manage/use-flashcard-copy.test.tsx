import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFlashcardCopy } from "@/components/flashcards/manage/use-flashcard-copy";
import type { FlashcardContentItem } from "@/lib/server/api-contracts";
import { FakeClipboard } from "@/test/fake-clipboard";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

type FlashcardCopyControls = ReturnType<typeof useFlashcardCopy>;

/** Stands in for the contents read: records each load and resolves on demand. */
class PendingFlashcardContents {
  readonly requestedIds: string[][] = [];
  private readonly resolvers: Array<(items: FlashcardContentItem[]) => void> =
    [];

  load(ids: readonly string[]): Promise<FlashcardContentItem[]> {
    this.requestedIds.push([...ids]);
    return new Promise((resolve) => this.resolvers.push(resolve));
  }

  resolve(index: number): void {
    const ids = this.requestedIds[index] ?? [];
    this.resolvers[index]?.(ids.map(toContentItem));
  }
}

const contents = vi.hoisted(() => ({
  current: null as PendingFlashcardContents | null,
}));

vi.mock("@/lib/read-api/flashcards", () => ({
  fetchFlashcardContents: (ids: readonly string[]) =>
    contents.current?.load(ids),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function toContentItem(id: string): FlashcardContentItem {
  return {
    id,
    front: `<p>Front ${id}</p>`,
    back: `<p>Back ${id}</p>`,
    subjectId: "subject-1",
    subjectName: "Biology",
    subjectPath: "Biology",
  };
}

function CopyHarness({
  onControls,
}: Readonly<{ onControls: (controls: FlashcardCopyControls) => void }>) {
  onControls(useFlashcardCopy());
  return null;
}

describe("useFlashcardCopy", () => {
  let container: HTMLDivElement;
  let root: Root;
  let clipboard: FakeClipboard;
  let controls: FlashcardCopyControls;

  beforeEach(async () => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    contents.current = new PendingFlashcardContents();
    clipboard = new FakeClipboard().install();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <CopyHarness
          onControls={(nextControls) => (controls = nextControls)}
        />,
      );
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    clipboard.uninstall();
    contents.current = null;
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("copies the selection in table order, not tick order", async () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];

    await act(async () => {
      const copy = controls.copySelectedFlashcards(rows, ["c", "a"]);
      contents.current?.resolve(0);
      await copy;
    });

    expect(contents.current?.requestedIds).toEqual([["a", "c"]]);
    const markdown = clipboard.lastText() ?? "";
    expect(markdown.indexOf("Front a")).toBeLessThan(
      markdown.indexOf("Front c"),
    );
  });

  it("stays copying until every overlapping copy finishes", async () => {
    let bulkCopy: Promise<void> = Promise.resolve();
    let rowCopy: Promise<void> = Promise.resolve();
    await act(async () => {
      bulkCopy = controls.copySelectedFlashcards([{ id: "a" }], ["a"]);
      rowCopy = controls.copyFlashcardsById(["b"]);
    });
    expect(controls.isCopying).toBe(true);

    await act(async () => {
      contents.current?.resolve(1);
      await rowCopy;
    });
    expect(controls.isCopying).toBe(true);

    await act(async () => {
      contents.current?.resolve(0);
      await bulkCopy;
    });
    expect(controls.isCopying).toBe(false);
  });
});
