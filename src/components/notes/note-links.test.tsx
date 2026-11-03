import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Editor } from "@tiptap/core";
import { act, type ReactNode, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NoteLinkedFrom,
  useNoteConnections,
} from "@/components/notes/note-linked-from";
import {
  NoteLinkPicker,
  type NoteLinkPickerSession,
} from "@/components/shared/note-link-picker";
import { TiptapEditor } from "@/components/shared/tiptap-editor";
import type { NoteConnections } from "@/lib/server/api-contracts";

const fetchNoteConnections = vi.hoisted(() => vi.fn());
const fetchSearchData = vi.hoisted(() => vi.fn());

vi.mock("@/lib/read-api/documents", () => ({ fetchNoteConnections }));
vi.mock("@/lib/read-api/search", () => ({ fetchSearchData }));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const LINKED_CONTENT =
  '<p><a data-note-id="n1" data-note-link="" href="/notes/n1">Old title</a></p>';

describe("note links", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function render(ui: ReactNode) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
      );
    });
  }

  async function settle(ms = 0) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    });
  }

  function LinkedFrom() {
    return <NoteLinkedFrom connections={useNoteConnections("n1")} />;
  }

  describe("linked from", () => {
    it("lists backlinks at their current location", async () => {
      fetchNoteConnections.mockResolvedValue({
        backlinks: [{ id: "n2", title: "Source", subjectId: "s1" }],
        outgoing: [],
        missingIds: [],
      } satisfies NoteConnections);

      await render(<LinkedFrom />);
      await settle();

      const link = container.querySelector("a");
      expect(link?.textContent).toBe("Source");
      expect(link?.getAttribute("href")).toBe(
        "/subjects/s1/documents/notes/n2",
      );
    });

    it("stays out of the way without backlinks", async () => {
      fetchNoteConnections.mockResolvedValue({
        backlinks: [],
        outgoing: [],
        missingIds: [],
      } satisfies NoteConnections);

      await render(<LinkedFrom />);
      await settle();

      expect(container.textContent).toBe("");
    });

    it("offers a retry after a failed load", async () => {
      fetchNoteConnections.mockRejectedValueOnce(new Error("offline"));
      fetchNoteConnections.mockResolvedValue({
        backlinks: [{ id: "n2", title: "Source", subjectId: "s1" }],
        outgoing: [],
        missingIds: [],
      } satisfies NoteConnections);

      await render(<LinkedFrom />);
      await settle();
      expect(container.textContent).toContain("Couldn't load linked notes");

      await act(async () => container.querySelector("button")?.click());
      await settle();

      expect(container.textContent).toContain("Source");
    });
  });

  describe("editor transactions", () => {
    function RetitledEditor({ title }: Readonly<{ title: string }>) {
      const [editor, setEditor] = useState<Editor | null>(null);
      useEffect(() => {
        editor?.view.dispatch(
          editor.state.tr.setDocAttribute("documentTitle", title),
        );
      }, [editor, title]);
      return (
        <TiptapEditor
          value={LINKED_CONTENT}
          onChange={() => {}}
          onEditorReady={setEditor}
        />
      );
    }

    it("can run from a React effect without flushSync errors", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await render(<RetitledEditor title="First" />);
      await settle(20);
      await render(<RetitledEditor title="Second" />);
      await settle(20);

      const messages = consoleError.mock.calls.map((call) => String(call[0]));
      consoleError.mockRestore();
      expect(messages.filter((text) => text.includes("flushSync"))).toEqual([]);
    });
  });

  describe("link chips", () => {
    const navigate = vi.fn();

    function renderEditorUi(targets: NoteConnections | null) {
      return render(
        <TiptapEditor
          value={LINKED_CONTENT}
          onChange={() => {}}
          noteLinks={{ sourceNoteId: "source", targets, navigate }}
        />,
      );
    }

    async function renderEditor(targets: NoteConnections | null) {
      await renderEditorUi(targets);
      await settle(20);
    }

    function chip() {
      return container.querySelector<HTMLAnchorElement>(
        '.tiptap a[href="/notes/n1"]',
      );
    }

    it("update when the target is renamed, and navigate in the app on click", async () => {
      await renderEditor(null);
      expect(chip()?.textContent).toBe("Old title");

      await renderEditor({
        backlinks: [],
        outgoing: [{ id: "n1", title: "Renamed", subjectId: "s1" }],
        missingIds: [],
      });
      expect(chip()?.textContent).toBe("Renamed");

      await act(async () => chip()?.click());
      expect(navigate).toHaveBeenCalledWith("/notes/n1");
    });

    it("show the target's current title and stable link", async () => {
      await renderEditor({
        backlinks: [],
        outgoing: [{ id: "n1", title: "New title", subjectId: "s1" }],
        missingIds: [],
      });

      const link = container.querySelector<HTMLAnchorElement>(
        '.tiptap a[href="/notes/n1"]',
      );
      expect(link?.textContent).toBe("New title");
    });

    it("fall back to the saved title before targets load", async () => {
      await renderEditor(null);

      expect(container.textContent).toContain("Old title");
    });

    it("show a missing target without a link", async () => {
      await renderEditor({ backlinks: [], outgoing: [], missingIds: ["n1"] });

      expect(container.textContent).toContain("Old title");
      expect(container.querySelector('.tiptap a[href="/notes/n1"]')).toBeNull();
    });
  });

  describe("picker", () => {
    const keyHandlerRef: {
      current: ((event: KeyboardEvent) => boolean) | null;
    } = { current: null };
    const choose = vi.fn();
    const onDismiss = vi.fn();

    function renderPicker(query: string) {
      const session: NoteLinkPickerSession = {
        query,
        getAnchorRect: () => null,
        choose,
      };
      return render(
        <NoteLinkPicker
          session={session}
          currentNoteId="current"
          keyHandlerRef={keyHandlerRef}
          onDismiss={onDismiss}
        />,
      );
    }

    function press(key: string) {
      let handled = false;
      act(() => {
        handled =
          keyHandlerRef.current?.(new KeyboardEvent("keydown", { key })) ??
          false;
      });
      return handled;
    }

    function options() {
      return Array.from(
        document.body.querySelectorAll<HTMLElement>('[role="option"]'),
      );
    }

    afterEach(() => {
      act(() => root.render(null));
    });

    it("searches notes, leaving out the current one, and picks by keyboard", async () => {
      fetchSearchData.mockResolvedValue({
        notes: [
          { id: "current", title: "Current", subjectName: "Bio" },
          { id: "a", title: "Alpha", subjectName: "Bio" },
          { id: "b", title: "Beta", subjectName: "Bio" },
        ],
        pdfs: [],
        flashcards: [],
      });

      await renderPicker("note");
      await settle(250);

      expect(options().map((option) => option.textContent)).toEqual([
        "AlphaBio",
        "BetaBio",
      ]);

      expect(press("ArrowDown")).toBe(true);
      expect(press("Enter")).toBe(true);
      expect(choose).toHaveBeenCalledWith({ noteId: "b", label: "Beta" });
    });

    it("waits for the search minimum and leaves Enter to the editor", async () => {
      await renderPicker("");
      await settle(250);

      expect(fetchSearchData).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain("Type to find a note");
      expect(press("Enter")).toBe(false);
    });

    it("reports a failed search and closes on Escape", async () => {
      fetchSearchData.mockRejectedValue(new Error("offline"));

      await renderPicker("note");
      await settle(250);

      expect(document.body.textContent).toContain("Couldn't search notes");
      expect(press("Escape")).toBe(true);
      expect(onDismiss).toHaveBeenCalled();
    });
  });
});
