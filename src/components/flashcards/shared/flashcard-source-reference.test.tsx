import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FlashcardSourceReference } from "@/components/flashcards/shared/flashcard-source-reference";
import type { FlashcardSourceLink } from "@/features/flashcards/source-contract";

describe("FlashcardSourceReference", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("links to the current note location and title", () => {
    const source: FlashcardSourceLink = {
      kind: "note",
      id: "doc-1",
      title: "Renamed source",
      subjectId: "moved-subject",
    };
    act(() => root.render(<FlashcardSourceReference source={source} />));
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe(
      "/subjects/moved-subject/documents/notes/doc-1",
    );
    expect(link?.textContent).toContain("Renamed source");
    expect(link?.getAttribute("aria-label")).toBe(
      "Source note: Renamed source",
    );
    expect(link?.getAttribute("target")).toBeNull();
  });

  it("opens a separate tab during sessions with an accessible indication", () => {
    act(() =>
      root.render(
        <FlashcardSourceReference
          source={{ kind: "note", id: "n1", title: "Cells", subjectId: "s1" }}
          newTab
        />,
      ),
    );
    const link = container.querySelector("a");
    expect(link?.target).toBe("_blank");
    expect(link?.rel).toContain("noopener");
    expect(link?.getAttribute("aria-label")).toContain("opens in a new tab");
  });

  it("renders nothing when a source has been deleted or was never attached", () => {
    act(() => root.render(<FlashcardSourceReference source={null} />));
    expect(container.textContent).toBe("");
    expect(container.querySelector("a")).toBeNull();
  });
});
