import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAssistantWorkspace } from "@/components/assistant/assistant-workspace-context";
import { AssistantWorkspaceProvider } from "@/components/assistant/assistant-workspace-provider";
import { PdfSelectionActions } from "@/components/pdfs/pdf-selection-actions";
import { usePdfStudyContext } from "@/components/pdfs/use-pdf-study-context";
import type {
  ExplanationSelection,
  SelectionExplanation,
} from "@/features/assistant/selection-explanation-contract";
import { FakeFlashcardEditChat } from "@/test/fake-flashcard-edit-chat";

const lookup = vi.hoisted(() => ({
  current: null as FakeSelectionLookup | null,
}));
vi.mock("@/lib/read-api/selection-explanation", () => ({
  fetchSelectionExplanation: (
    selection: ExplanationSelection,
    signal: AbortSignal,
  ) => lookup.current?.fetch(selection, signal),
}));

const definition = { text: "Average revenue per user over a given period." };

const pdfDocument = {
  getPage: async () => ({ getTextContent: async () => ({ items: [] }) }),
};
const ASK = "Ask assistant about selected text";

const passage =
  "A concept can have several connected parts that are easier to understand together.\nThe second line describes how those parts interact and why their relationships matter.";

/** An observable lookup boundary; can fail or hold a reply while selection moves. */
class FakeSelectionLookup {
  readonly calls: Array<{
    selection: ExplanationSelection;
    signal: AbortSignal;
  }> = [];
  response: SelectionExplanation | Error | Promise<SelectionExplanation> =
    definition;

  fetch = async (selection: ExplanationSelection, signal: AbortSignal) => {
    this.calls.push({ selection, signal });
    if (this.response instanceof Error) throw this.response;
    return this.response;
  };
}

function ReaderHarness() {
  const pagesRef = useRef<HTMLDivElement>(null);
  const workspace = useAssistantWorkspace();
  usePdfStudyContext({
    pdf: { id: "pdf-1", title: "Report" },
    subjectPath: "Finance",
    pdfDocument,
    currentPage: 1,
    pagesRef,
  });
  return (
    <>
      <div ref={pagesRef}>
        <div data-page-number="1">
          <span>Quarterly revenue: </span>
          <span id="term">ARPU</span>
          <span> increased alongside </span>
          <span id="other">MRR</span>
          <span>.</span>
          <span id="passage">{passage}</span>
          <span id="long">{"x".repeat(4001)}</span>
          <span id="cross-start">{"A concept continues\n"}</span>
        </div>
        <div data-page-number="2">
          <span id="cross-end">on the following page.</span>
          <span>Another context for </span>
          <span id="same-term">ARPU</span>
          <span>.</span>
        </div>
        <div data-page-number="3">
          <span id="whole-page">Alone on its page</span>
        </div>
      </div>
      <p id="outside">Outside the PDF</p>
      <output>
        {JSON.stringify({
          open: workspace?.open,
          context: workspace?.context,
        })}
      </output>
      <PdfSelectionActions pagesRef={pagesRef} />
    </>
  );
}

describe("PDF selection actions", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let selectionRect: DOMRect;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    selectionRect = new DOMRect(100, 100, 40, 18);
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.hasAttribute("data-selection-actions"))
          return new DOMRect(0, 0, 100, 32);
        return originalRect.call(this);
      },
    );
    // jsdom has no layout; selections share a visible rectangle in this reader.
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: () => [selectionRect],
    });
    lookup.current = new FakeSelectionLookup();
    client = new QueryClient();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <QueryClientProvider client={client}>
          <AssistantWorkspaceProvider transport={new FakeFlashcardEditChat()}>
            <ReaderHarness />
          </AssistantWorkspaceProvider>
        </QueryClientProvider>,
      ),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    window.getSelection()?.removeAllRanges();
    delete (Range.prototype as Partial<Range>).getClientRects;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function settle() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
  }

  function button(label: string) {
    return Array.from(
      document.querySelectorAll<HTMLButtonElement>("button"),
    ).find(
      (item) =>
        item.getAttribute("aria-label") === label || item.textContent === label,
    );
  }

  function readWorkspace() {
    return JSON.parse(container.querySelector("output")?.textContent ?? "null");
  }

  async function select(id = "term") {
    const range = document.createRange();
    range.selectNodeContents(container.querySelector(`#${id}`) as Node);
    act(() => {
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    await settle();
  }

  async function click(label: string) {
    const target = button(label);
    expect(target).toBeDefined();
    await act(async () => target?.click());
    await settle();
  }

  it("looks up only after clicking and preserves the native selection for copying", async () => {
    await select();
    expect(button("Explain selected text")).toBeDefined();
    expect(lookup.current?.calls).toHaveLength(0);
    expect(window.getSelection()?.toString()).toBe("ARPU");
    await click("Explain selected text");
    expect(document.body.textContent).toContain(definition.text);
    expect(lookup.current?.calls).toHaveLength(1);
    expect(lookup.current?.calls[0]?.selection).toEqual({
      text: "ARPU",
      context: expect.stringContaining("Quarterly revenue:"),
    });
  });

  it("positions Explain away from the selection menu at the end of a selection", async () => {
    selectionRect = new DOMRect(400, 300, 60, 18);
    await select();
    const trigger = button("Explain selected text")?.parentElement;
    expect(trigger).toBeDefined();
    const left = Number.parseFloat(trigger?.style.left ?? "NaN");
    const top = Number.parseFloat(trigger?.style.top ?? "NaN");
    expect(left + 100).toBeLessThan(selectionRect.left);
    expect(top).toBeGreaterThan(selectionRect.bottom);
    expect(lookup.current?.calls).toHaveLength(0);
  });

  it("uses the space above when the left side is crowded", async () => {
    selectionRect = new DOMRect(20, 200, 40, 18);
    await select();
    const trigger = button("Explain selected text")?.parentElement;
    const left = Number.parseFloat(trigger?.style.left ?? "NaN");
    const top = Number.parseFloat(trigger?.style.top ?? "NaN");
    expect(left).toBeGreaterThanOrEqual(8);
    expect(top + 32).toBeLessThan(selectionRect.top);
  });

  it("keeps the complete button onscreen near the bottom of the window", async () => {
    selectionRect = new DOMRect(
      window.innerWidth - 40,
      window.innerHeight - 24,
      30,
      18,
    );
    await select();
    const trigger = button("Explain selected text")?.parentElement;
    const left = Number.parseFloat(trigger?.style.left ?? "NaN");
    const top = Number.parseFloat(trigger?.style.top ?? "NaN");
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + 100).toBeLessThanOrEqual(window.innerWidth - 8);
    expect(top + 32).toBeLessThan(selectionRect.top);
  });

  it("waits for a drag to finish before offering Explain", async () => {
    act(() =>
      container
        .querySelector("#term")
        ?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })),
    );
    await select();
    expect(button("Explain selected text")).toBeUndefined();
    act(() =>
      document.dispatchEvent(new MouseEvent("pointerup", { bubbles: true })),
    );
    await settle();
    expect(button("Explain selected text")).toBeDefined();
  });

  it("offers a selection made by a touch long-press, which cancels the pointer", async () => {
    act(() =>
      container
        .querySelector("#term")
        ?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })),
    );
    await select();
    act(() =>
      document.dispatchEvent(
        new MouseEvent("pointercancel", { bubbles: true }),
      ),
    );
    await settle();
    expect(button("Explain selected text")).toBeDefined();
  });

  it("does not offer an old selection when a touch becomes a scroll", async () => {
    await select();
    act(() =>
      container
        .querySelector("#term")
        ?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })),
    );
    await settle();
    act(() =>
      document.dispatchEvent(
        new MouseEvent("pointercancel", { bubbles: true }),
      ),
    );
    await settle();
    expect(button("Explain selected text")).toBeUndefined();
  });

  it("keeps Explain visible for oversized selections and shows the limit without sending a request", async () => {
    await select("long");
    expect(button("Explain selected text")).toBeDefined();
    expect(window.getSelection()?.toString()).toBe("x".repeat(4001));
    await click("Explain selected text");
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "4,000",
    );
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "shorter",
    );
    expect(lookup.current?.calls).toHaveLength(0);
  });

  it("explains a multiline passage and keeps the full selection in its request", async () => {
    if (!lookup.current) throw new Error("Missing fake lookup");
    lookup.current.response = {
      text: "The parts work together, so changing one can affect the others.",
    };
    await select("passage");
    expect(button("Explain selected text")).toBeDefined();
    expect(lookup.current.calls).toHaveLength(0);
    await click("Explain selected text");
    expect(lookup.current.calls[0]?.selection.text).toBe(passage);
    expect(
      lookup.current.calls[0]?.selection.context.length,
    ).toBeLessThanOrEqual(1000);
    expect(document.body.textContent).toContain(
      "The parts work together, so changing one can affect the others.",
    );
    expect(
      document.querySelector("h3")?.textContent?.length,
    ).toBeLessThanOrEqual(101);
  });

  it("sends no surrounding context when the selection is all the page has", async () => {
    await select("whole-page");
    await click("Explain selected text");
    expect(lookup.current?.calls[0]?.selection).toEqual({
      text: "Alone on its page",
      context: "",
    });
  });

  it("asks the assistant with the selection as context, without an AI request", async () => {
    await select();
    await click(ASK);
    expect(readWorkspace()).toMatchObject({
      open: true,
      context: { scope: "selection", content: "ARPU" },
    });
    expect(lookup.current?.calls).toHaveLength(0);
    expect(button(ASK)).toBeUndefined();
    expect(window.getSelection()?.toString()).toBe("ARPU");
  });

  it("can move from an open explanation to the assistant", async () => {
    await select();
    await click("Explain selected text");
    const ask = button(ASK);
    act(() => {
      ask?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });
    await settle();
    await click(ASK);
    expect(readWorkspace()).toMatchObject({
      open: true,
      context: { scope: "selection", content: "ARPU" },
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("ignores selections outside the PDF", async () => {
    await select("outside");
    expect(button("Explain selected text")).toBeUndefined();
    expect(lookup.current?.calls).toHaveLength(0);
  });

  it("supports selections crossing a page boundary", async () => {
    const range = document.createRange();
    range.setStart(
      container.querySelector("#cross-start")?.firstChild as Node,
      0,
    );
    const end = container.querySelector("#cross-end")?.firstChild as Node;
    range.setEnd(end, end.textContent?.length ?? 0);
    act(() => {
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    await settle();
    expect(button("Explain selected text")).toBeDefined();
    expect(lookup.current?.calls).toHaveLength(0);
    const selected = window.getSelection()?.toString();
    await click("Explain selected text");
    expect(lookup.current?.calls[0]?.selection.text).toBe(selected);
  });

  it.each(["escape", "outside", "scroll"])(
    "dismisses the card on %s",
    async (method) => {
      await select();
      await click("Explain selected text");
      act(() => {
        if (method === "escape")
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
          );
        else if (method === "scroll")
          container
            .querySelector("[data-page-number]")
            ?.dispatchEvent(new Event("scroll"));
        else
          container
            .querySelector("#outside")
            ?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      });
      await settle();
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(button("Explain selected text")).toBeUndefined();
    },
  );

  it("caches repeated lookups while keeping different context separate", async () => {
    await select();
    await click("Explain selected text");
    await click("Close explanation");
    await select();
    await click("Explain selected text");
    expect(lookup.current?.calls).toHaveLength(1);
    await click("Close explanation");
    await select("same-term");
    await click("Explain selected text");
    expect(lookup.current?.calls).toHaveLength(2);
  });

  it("shows a safe failure with an explicit retry", async () => {
    if (!lookup.current) throw new Error("Missing fake lookup");
    lookup.current.response = new Error(
      '{"errorCode":"assistant.explanationUnavailable"}',
    );
    await select();
    await click("Explain selected text");
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't explain this selection",
    );
    expect(lookup.current.calls).toHaveLength(1);
    lookup.current.response = definition;
    await click("Retry");
    expect(document.body.textContent).toContain(definition.text);
    expect(lookup.current.calls).toHaveLength(2);
  });

  it("cancels a dismissed request and ignores its late reply", async () => {
    let finish!: (result: SelectionExplanation) => void;
    if (!lookup.current) throw new Error("Missing fake lookup");
    lookup.current.response = new Promise((resolve) => {
      finish = resolve;
    });
    await select();
    await click("Explain selected text");
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      "Explaining",
    );
    const firstSignal = lookup.current.calls[0]?.signal;
    await click("Close explanation");
    expect(firstSignal?.aborted).toBe(true);
    lookup.current.response = {
      ...definition,
      text: "Monthly recurring revenue.",
    };
    await select("other");
    await click("Explain selected text");
    await act(async () => finish(definition));
    await settle();
    expect(document.body.textContent).toContain("Monthly recurring revenue.");
    expect(document.body.textContent).not.toContain(definition.text);
  });
});
