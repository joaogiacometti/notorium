import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import {
  type PdfTextSource,
  usePdfStudyContext,
} from "@/components/pdfs/use-pdf-study-context";
import { FakeFlashcardEditChat } from "@/test/fake-flashcard-edit-chat";

/** Serves fixed text per page, or fails pages listed in `failing`. */
class FakePdfTextDocument implements PdfTextSource {
  constructor(
    private readonly pages: Record<number, string>,
    private readonly failing: number[] = [],
  ) {}

  async getPage(pageNumber: number) {
    if (this.failing.includes(pageNumber))
      throw new Error(`Expected page 1-3, got ${pageNumber}`);
    const text = this.pages[pageNumber] ?? "";
    return {
      getTextContent: async () => ({
        items: text ? [{ str: text, hasEOL: false }] : [],
      }),
    };
  }
}

/** Stands in for the CSS Custom Highlight API, which jsdom lacks. */
class FakeHighlight {
  readonly ranges: Range[];
  constructor(...ranges: Range[]) {
    this.ranges = ranges;
  }
}

interface ReaderHarnessProps {
  pdfDocument: PdfTextSource;
  currentPage: number;
}

function ReaderHarness({ pdfDocument, currentPage }: ReaderHarnessProps) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const workspace = useAssistantWorkspace();
  usePdfStudyContext({
    pdf: { id: "pdf-1", title: "Cell biology" },
    subjectPath: "Biology",
    pdfDocument,
    currentPage,
    pagesRef,
  });
  return (
    <>
      <div ref={pagesRef}>
        <div data-page-number="2">
          <span id="selectable">Mitochondria make ATP.</span>
        </div>
        <div data-page-number="3">
          <span id="next-page">Ribosomes build proteins.</span>
        </div>
      </div>
      <textarea aria-label="Composer" />
      <button type="button" onClick={workspace?.clearContextSelection}>
        Clear selection
      </button>
      <output>{JSON.stringify(workspace?.context ?? null)}</output>
    </>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
});

async function renderReader(pdfDocument: PdfTextSource, currentPage: number) {
  await act(async () =>
    root.render(
      <AssistantWorkspaceProvider transport={new FakeFlashcardEditChat()}>
        <ReaderHarness pdfDocument={pdfDocument} currentPage={currentPage} />
      </AssistantWorkspaceProvider>,
    ),
  );
}

function readContext() {
  return JSON.parse(container.querySelector("output")?.textContent ?? "null");
}

async function selectNode(node: Node, collapsed = false) {
  const range = document.createRange();
  range.selectNodeContents(node);
  if (collapsed) range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  await act(async () => document.dispatchEvent(new Event("selectionchange")));
}

describe("usePdfStudyContext", () => {
  it("offers the visible page's text and follows page changes", async () => {
    const pdf = new FakePdfTextDocument({ 1: "Cells", 3: "Membranes" });
    await renderReader(pdf, 1);
    expect(readContext()).toMatchObject({
      kind: "pdf",
      documentId: "pdf-1",
      page: 1,
      scope: "page",
      content: "Cells",
    });
    await renderReader(pdf, 3);
    expect(readContext()).toMatchObject({ page: 3, content: "Membranes" });
  });

  it("prefers a selection and keeps it while the composer takes focus", async () => {
    await renderReader(new FakePdfTextDocument({ 1: "Cells" }), 1);
    const selectable = container.querySelector("#selectable") as Node;
    await selectNode(selectable);
    expect(readContext()).toMatchObject({
      page: 2,
      scope: "selection",
      content: "Mitochondria make ATP.",
    });
    await selectNode(container.querySelector("textarea") as Node);
    expect(readContext()).toMatchObject({ scope: "selection" });
    await act(async () =>
      selectable.dispatchEvent(new Event("pointerdown", { bubbles: true })),
    );
    await selectNode(selectable, true);
    expect(readContext()).toMatchObject({ page: 1, scope: "page" });
  });

  it("keeps a selection whose text layer re-renders under it", async () => {
    await renderReader(new FakePdfTextDocument({ 1: "Cells" }), 1);
    const selectable = container.querySelector("#selectable") as Node;
    await selectNode(selectable);
    // A re-rendered text layer collapses the selection onto the page itself.
    await selectNode(selectable.parentNode as Node, true);
    expect(readContext()).toMatchObject({
      scope: "selection",
      content: "Mitochondria make ATP.",
    });
  });

  it("labels a selection by its first page when dragged backward", async () => {
    await renderReader(new FakePdfTextDocument({ 1: "Cells" }), 1);
    const first = container.querySelector("#selectable")?.firstChild as Node;
    const last = container.querySelector("#next-page")?.firstChild as Node;
    await act(async () => {
      window.getSelection()?.setBaseAndExtent(last, 5, first, 2);
      document.dispatchEvent(new Event("selectionchange"));
    });
    expect(readContext()).toMatchObject({ page: 2, scope: "selection" });
  });

  it("lets the user drop the selection from the assistant", async () => {
    await renderReader(new FakePdfTextDocument({ 1: "Cells" }), 1);
    await selectNode(container.querySelector("#selectable") as Node);
    expect(readContext()).toMatchObject({ scope: "selection" });
    await act(async () => container.querySelector("button")?.click());
    expect(readContext()).toMatchObject({ page: 1, scope: "page" });
    expect(window.getSelection()?.isCollapsed).toBe(true);
  });

  it("returns to the visible page once the selection stops rendering", async () => {
    const pdf = new FakePdfTextDocument({
      1: "Cells",
      4: "Tissues",
      5: "Organs",
    });
    await renderReader(pdf, 1);
    await selectNode(container.querySelector("#selectable") as Node);
    await renderReader(pdf, 4);
    expect(readContext()).toMatchObject({ page: 2, scope: "selection" });
    await renderReader(pdf, 5);
    expect(readContext()).toMatchObject({
      page: 5,
      scope: "page",
      content: "Organs",
    });
  });

  it("sends empty text for a page with no text layer", async () => {
    await renderReader(new FakePdfTextDocument({}), 1);
    expect(readContext()).toMatchObject({ page: 1, content: "" });
  });

  it("drops the context when a page's text cannot be read", async () => {
    await renderReader(new FakePdfTextDocument({}, [1]), 1);
    expect(readContext()).toBeNull();
  });

  it("paints a kept selection only while the native one is elsewhere", async () => {
    const highlights = new Map<string, FakeHighlight>();
    vi.stubGlobal("Highlight", FakeHighlight);
    vi.stubGlobal("CSS", { highlights });
    await renderReader(new FakePdfTextDocument({ 1: "Cells" }), 1);
    const selectable = container.querySelector("#selectable") as Node;
    await selectNode(selectable);
    expect(highlights.size).toBe(0);
    await selectNode(container.querySelector("textarea") as Node, true);
    const painted = highlights.get("pdf-kept-selection")?.ranges[0];
    expect(painted?.toString()).toBe("Mitochondria make ATP.");
    await act(async () =>
      selectable.dispatchEvent(new Event("pointerdown", { bubbles: true })),
    );
    expect(highlights.size).toBe(0);
  });
});
