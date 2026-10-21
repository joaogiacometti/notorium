import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantLibraryResults } from "@/components/assistant/assistant-library-results";
import type { LibraryHit } from "@/features/assistant/library-search-contract";
import type { AssistantLibrarySearchPart } from "@/features/assistant/types";

const noteHit: LibraryHit = {
  kind: "note",
  id: "note-1",
  subjectId: "subject-1",
  title: "Mitose",
  subjectPath: "Biologia::Células",
  snippet: "...a mitose produz duas células...",
};

const input = { terms: ["mitose", "mitosis"] };

function finishedSearch(hits: LibraryHit[]): AssistantLibrarySearchPart {
  return {
    type: "tool-searchLibrary",
    toolCallId: "call-1",
    state: "output-available",
    input,
    output: { hits },
  };
}

describe("AssistantLibraryResults", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(search: AssistantLibrarySearchPart, onOpenHit?: () => void) {
    act(() => {
      root.render(
        <AssistantLibraryResults search={search} onOpenHit={onOpenHit} />,
      );
    });
  }

  it("links each hit to its page with its subject and excerpt", () => {
    const onOpenHit = vi.fn();
    render(
      finishedSearch([
        noteHit,
        {
          ...noteHit,
          kind: "flashcard",
          id: "card-1",
          title: "O que é mitose?",
        },
      ]),
      onOpenHit,
    );

    const links = [...container.querySelectorAll("a")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/subjects/subject-1/documents/notes/note-1",
      "/flashcards/card-1",
    ]);
    expect(links[0]?.textContent).toContain("Note: Mitose");
    expect(links[0]?.textContent).toContain("Biologia::Células");
    expect(links[0]?.textContent).toContain("duas células");

    act(() => links[1]?.click());
    expect(onOpenHit).toHaveBeenCalledTimes(1);
  });

  it("shows progress while the search runs", () => {
    render({
      type: "tool-searchLibrary",
      toolCallId: "call-1",
      state: "input-available",
      input,
    });

    expect(container.textContent).toBe("Searching your library…");
  });

  it("renders nothing when nothing matched", () => {
    render(finishedSearch([]));

    expect(container.innerHTML).toBe("");
  });
});
