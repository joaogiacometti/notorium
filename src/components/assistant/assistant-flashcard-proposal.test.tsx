import type { UseChatHelpers } from "@ai-sdk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantFlashcardProposal } from "@/components/assistant/assistant-flashcard-proposal";
import { useFlashcardProposalOutcomes } from "@/components/assistant/use-flashcard-proposal-outcomes";
import type {
  FlashcardProposalOutput,
  ProposedFlashcard,
} from "@/features/assistant/tools";
import type {
  AssistantFlashcardProposalPart,
  AssistantUIMessage,
} from "@/features/assistant/types";
import type { CreateFlashcardForm } from "@/features/flashcards/validation";
import type { CreateFlashcardResult } from "@/lib/server/api-contracts";
import { FakeReadApiFetch } from "@/test/fake-read-api-fetch";

/** Stands in for the flashcard Server Actions; records created cards. */
class FakeFlashcardActions {
  readonly created: CreateFlashcardForm[] = [];
  nextResult: CreateFlashcardResult = {
    success: true,
    flashcard: { id: "card-1" } as Extract<
      CreateFlashcardResult,
      { success: true }
    >["flashcard"],
  };

  createFlashcard = async (
    data: CreateFlashcardForm,
  ): Promise<CreateFlashcardResult> => {
    this.created.push(data);
    return this.nextResult;
  };
}

const fakes = vi.hoisted(() => ({
  actions: null as FakeFlashcardActions | null,
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/app/actions/flashcards", () => ({
  createFlashcard: (data: CreateFlashcardForm) =>
    fakes.actions?.createFlashcard(data),
}));

vi.mock("sonner", () => ({
  toast: { error: fakes.toastError, success: fakes.toastSuccess },
}));

vi.mock("@/components/shared/tiptap-renderer", () => ({
  TiptapRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

interface RecordedToolOutput {
  toolCallId: string;
  output: FlashcardProposalOutput;
}

/**
 * The slice of `useChat` the proposal hook uses: one assistant message whose
 * tool part takes recorded outputs, like `addToolOutput` does.
 */
function ProposalChatHarness({
  initialPart,
  recorded,
}: Readonly<{
  initialPart: AssistantFlashcardProposalPart;
  recorded: RecordedToolOutput[];
}>) {
  const [part, setPart] = useState(initialPart);
  const messages: AssistantUIMessage[] = [
    { id: "a1", role: "assistant", parts: [part] },
  ];
  const addToolOutput = (async ({ toolCallId, output }: RecordedToolOutput) => {
    recorded.push({ toolCallId, output });
    setPart(
      (current) =>
        ({
          ...current,
          state: "output-available",
          input: current.input,
          output,
        }) as AssistantFlashcardProposalPart,
    );
  }) as UseChatHelpers<AssistantUIMessage>["addToolOutput"];
  const controls = useFlashcardProposalOutcomes({ messages, addToolOutput });

  return (
    <>
      <AssistantFlashcardProposal
        proposal={part}
        disabled={false}
        controls={controls}
      />
      <button type="button" onClick={() => void controls.skipOpenCards()}>
        Send next message
      </button>
    </>
  );
}

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const subjects = [
  { id: "bio", name: "Biology", path: "Biology" },
  { id: "cells", name: "Cells", path: "Biology::Cells" },
];

const atpCard = { front: "What is ATP?", back: "Energy carrier." };
const dnaCard = { front: "What is DNA?", back: "Genetic material." };

function pendingProposal(
  subjectPath?: string,
  cards: ProposedFlashcard[] = [atpCard],
): AssistantFlashcardProposalPart {
  return {
    type: "tool-proposeFlashcards",
    toolCallId: "call-1",
    state: "input-available",
    input: { cards: cards.map((card) => ({ ...card, subjectPath })) },
  };
}

describe("AssistantFlashcardProposal", () => {
  let container: HTMLDivElement;
  let root: Root;
  let resolved: RecordedToolOutput[];

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    fakes.actions = new FakeFlashcardActions();
    fakes.toastError.mockReset();
    new FakeReadApiFetch().install().replyJson(200, subjects);
    resolved = [];
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderProposal(proposal: AssistantFlashcardProposalPart) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ProposalChatHarness initialPart={proposal} recorded={resolved} />
        </QueryClientProvider>,
      );
    });
  }

  // Let the subject options request settle so the preselection is in place.
  async function renderPendingProposal(
    subjectPath: string,
    cards?: ProposedFlashcard[],
  ) {
    await renderProposal(pendingProposal(subjectPath, cards));
    await act(async () => {
      await vi.waitFor(() =>
        expect(container.textContent).not.toContain("Loading subjects"),
      );
    });
  }

  function button(name: string): HTMLButtonElement {
    const match = [...container.querySelectorAll("button")].find((element) =>
      element.textContent?.includes(name),
    );
    if (!match) throw new Error(`No button labelled "${name}"`);
    return match;
  }

  async function click(name: string) {
    await act(async () => {
      button(name).click();
    });
  }

  it("records the outcomes once every proposed card is handled", async () => {
    await renderPendingProposal("Biology", [atpCard, dnaCard]);

    await click("Create");
    expect(resolved).toEqual([]);
    expect(container.textContent).toContain("Flashcard created:What is ATP?");

    await click("Discard");

    expect(fakes.actions?.created.map((card) => card.front)).toEqual([
      "<p>What is ATP?</p>",
    ]);
    expect(resolved).toEqual([
      { toolCallId: "call-1", output: { outcomes: ["created", "dismissed"] } },
    ]);
  });

  it("preselects the proposed subject and creates the card as rich text", async () => {
    await renderPendingProposal("Biology::Cells");

    await click("Create");

    expect(fakes.actions?.created).toEqual([
      {
        subjectId: "cells",
        front: "<p>What is ATP?</p>",
        back: "<p>Energy carrier.</p>",
      },
    ]);
    expect(resolved).toEqual([
      { toolCallId: "call-1", output: { outcomes: ["created"] } },
    ]);
  });

  it("shows a code example apart and appends it to the created back", async () => {
    const example = { language: "prolog", code: "p(1).\n\n?- p(X)." };
    await renderPendingProposal("Biology", [{ ...atpCard, example }]);

    expect(container.textContent).toContain("Example");
    await click("Create");

    expect(fakes.actions?.created[0]?.back).toBe(
      '<p>Energy carrier.</p><pre><code class="language-prolog">p(1).\n\n?- p(X).</code></pre>',
    );
  });

  it("keeps Create disabled until a subject is known", async () => {
    await renderPendingProposal("Chemistry");

    expect(button("Create").disabled).toBe(true);
  });

  it("stays pending and shows the error when creating fails", async () => {
    if (fakes.actions) {
      fakes.actions.nextResult = {
        success: false,
        errorCode: "flashcards.duplicateFront",
        errorMessage: "A flashcard with this front already exists.",
      } as CreateFlashcardResult;
    }
    await renderPendingProposal("Biology");

    await click("Create");

    expect(fakes.toastError).toHaveBeenCalledWith(
      "A flashcard with this front already exists.",
    );
    expect(resolved).toEqual([]);
  });

  it("records a discarded proposal without creating it", async () => {
    await renderPendingProposal("Biology");

    await click("Discard");

    expect(fakes.actions?.created).toEqual([]);
    expect(resolved).toEqual([
      { toolCallId: "call-1", output: { outcomes: ["dismissed"] } },
    ]);
  });

  it("skips open cards on the next message and lets the user restore them", async () => {
    await renderPendingProposal("Biology", [atpCard, dnaCard]);
    await click("Create");

    await click("Send next message");
    expect(container.textContent).toContain("Skipped:What is DNA?");
    await click("Restore");
    await click("Discard");

    expect(resolved).toEqual([
      { toolCallId: "call-1", output: { outcomes: ["created", "skipped"] } },
      { toolCallId: "call-1", output: { outcomes: ["created", "dismissed"] } },
    ]);
    expect(container.textContent).toContain("Discarded:What is DNA?");
  });

  it("explains a proposal the SDK rejected for invalid input", async () => {
    await renderProposal({
      type: "tool-proposeFlashcards",
      toolCallId: "call-1",
      state: "output-error",
      input: { cards: [] },
      errorText: "Invalid input",
    } as AssistantFlashcardProposalPart);

    expect(container.textContent).toContain("could not be drafted");
  });

  it("shows the outcome of an answered proposal", async () => {
    await renderProposal({
      type: "tool-proposeFlashcards",
      toolCallId: "call-1",
      state: "output-available",
      input: { cards: [atpCard, dnaCard] },
      output: { outcomes: ["created", "dismissed"] },
    });

    expect(container.textContent).toContain("Flashcard created:What is ATP?");
    expect(container.textContent).toContain("Discarded:What is DNA?");
    expect(container.textContent).not.toContain("Create");
  });
});
