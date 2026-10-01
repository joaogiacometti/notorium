import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BulkMoveFlashcardsDialog } from "@/components/flashcards/manage/bulk-move-flashcards-dialog";
import type { SubjectOption } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const {
  bulkMoveFlashcardsMock,
  createSubjectMock,
  getDecksMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  bulkMoveFlashcardsMock: vi.fn(),
  createSubjectMock: vi.fn(),
  getDecksMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/app/actions/subjects", () => ({
  createSubject: createSubjectMock,
  getSubjectOptions: getDecksMock,
}));

vi.mock("@/app/actions/flashcards", () => ({
  bulkMoveFlashcards: bulkMoveFlashcardsMock,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

const subjects: SubjectOption[] = [
  {
    id: "deck-1",
    userId: "user-1",
    parentSubjectId: null,
    kind: "general",
    totalClasses: null,
    maxMisses: null,
    name: "Spanish",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    path: "Languages::Spanish",
  },
  {
    id: "deck-2",
    userId: "user-1",
    parentSubjectId: "deck-1",
    kind: "general",
    totalClasses: null,
    maxMisses: null,
    name: "Verbs",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    path: "Languages::Spanish::Verbs",
  },
];

const createdSubject: SubjectOption = {
  ...subjects[0],
  id: "deck-3",
  parentSubjectId: null,
  name: "Chemistry",
  path: "Chemistry",
};

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function getSearchInput(): HTMLInputElement {
  const input = document.body.querySelector(
    'input[placeholder="Search subjects by path"]',
  );

  if (!(input instanceof HTMLInputElement)) {
    throw new TypeError("Expected subject search input");
  }

  return input;
}

function getCombobox(): HTMLButtonElement {
  const combobox = document.body.querySelector(
    'button[aria-haspopup="listbox"]',
  );

  if (!(combobox instanceof HTMLButtonElement)) {
    throw new TypeError("Expected listbox trigger button");
  }

  return combobox;
}

function getCommandItems(): HTMLElement[] {
  return Array.from(
    document.body.querySelectorAll('[data-slot="command-item"]'),
  ).filter((item): item is HTMLElement => item instanceof HTMLElement);
}

describe("BulkMoveFlashcardsDialog", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  function renderDialog(ids: string[], onMoved = vi.fn()) {
    root.render(
      <QueryClientProvider client={queryClient}>
        <BulkMoveFlashcardsDialog
          ids={ids}
          open
          onMoved={onMoved}
          onOpenChange={vi.fn()}
        />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient();
    getDecksMock.mockResolvedValue(subjects);
    bulkMoveFlashcardsMock.mockResolvedValue({
      success: true,
      ids: ["flashcard-1"],
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("does not refetch decks or reset the selected subject on rerender with the same ids", async () => {
    const ids = ["flashcard-1"];

    await act(async () => {
      renderDialog(ids);
    });

    await act(async () => {});

    expect(getDecksMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      getCombobox().click();
    });

    const deckOption = getCommandItems().find((item) =>
      item.textContent?.includes("Languages::Spanish::Verbs"),
    );

    expect(deckOption).toBeTruthy();

    await act(async () => {
      deckOption?.click();
    });

    expect(getCombobox().textContent).toContain("Languages::Spanish::Verbs");

    await act(async () => {
      renderDialog(ids);
    });

    await act(async () => {});

    expect(getDecksMock).toHaveBeenCalledTimes(1);
    expect(getCombobox().textContent).toContain("Languages::Spanish::Verbs");
  });

  it("creates a missing subject inline, selects it, and moves into it", async () => {
    createSubjectMock.mockResolvedValue({ success: true, subjectId: "deck-3" });

    await act(async () => {
      renderDialog(["flashcard-1"]);
    });
    await act(async () => {
      getCombobox().click();
    });
    await act(async () => {
      setInputValue(getSearchInput(), "Chemistry");
    });

    getDecksMock.mockResolvedValue([...subjects, createdSubject]);
    const createOption = getCommandItems().find(
      (item) => item.textContent === "Create Chemistry",
    );
    expect(createOption).toBeTruthy();

    await act(async () => {
      createOption?.click();
    });

    expect(createSubjectMock).toHaveBeenCalledWith({
      name: "Chemistry",
      kind: "general",
    });
    expect(getCombobox().textContent).toContain("Chemistry");

    const form = document.body.querySelector("form");
    await act(async () => {
      form?.requestSubmit();
    });

    expect(bulkMoveFlashcardsMock).toHaveBeenCalledWith({
      ids: ["flashcard-1"],
      subjectId: "deck-3",
    });
  });
});
