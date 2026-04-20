import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeckTreeSidebar } from "@/components/decks/deck-tree-sidebar";
import type { DeckEntity, DeckTreeNode } from "@/lib/server/api-contracts";

const { moveDeckMock, replaceMock, refreshMock, toastErrorMock } = vi.hoisted(
  () => ({
    moveDeckMock: vi.fn(),
    replaceMock: vi.fn(),
    refreshMock: vi.fn(),
    toastErrorMock: vi.fn(),
  }),
);

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

vi.mock("@/app/actions/decks", () => ({
  moveDeck: moveDeckMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/components/decks/create-deck-dialog", () => ({
  CreateDeckDialog: ({ trigger }: { trigger: ReactNode }) => trigger,
}));

vi.mock("@/components/decks/edit-deck-dialog", () => ({
  EditDeckDialog: ({
    deck,
    open,
    onSaved,
    onOpenChange,
  }: {
    deck: {
      id: string;
      name: string;
    };
    open: boolean;
    onSaved?: (deck: DeckEntity) => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <button
        type="button"
        onClick={() => {
          onSaved?.({
            id: deck.id,
            userId: "user-1",
            parentDeckId: null,
            name: "Renamed Deck",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-02T00:00:00.000Z"),
          });
          onOpenChange(false);
        }}
      >
        Confirm Edit
      </button>
    ) : null,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => children,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/decks/delete-deck-dialog", () => ({
  DeleteDeckDialog: ({
    deckId,
    deckName,
    open,
    onDeleted,
  }: {
    deckId: string;
    deckName: string;
    open: boolean;
    onDeleted?: (deckId: string) => void;
  }) =>
    open ? (
      <div>
        <span>{deckName}</span>
        <button
          type="button"
          onClick={() => {
            onDeleted?.(deckId);
          }}
        >
          Confirm Delete
        </button>
      </div>
    ) : null,
}));

function createDeckNode(
  id: string,
  flashcardCount: number,
  children: DeckTreeNode[] = [],
): DeckTreeNode {
  return {
    id,
    userId: "user-1",
    parentDeckId: null,
    name: id,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    flashcardCount,
    children,
    path: id,
  };
}

function clickButtonByText(container: HTMLDivElement, text: string, index = 0) {
  const buttons = Array.from(container.querySelectorAll("button")).filter(
    (currentButton) => currentButton.textContent?.includes(text),
  );
  const button = buttons[index];

  expect(button).toBeTruthy();
  button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function clickButtonByLabel(
  container: HTMLDivElement,
  label: string,
  index = 0,
) {
  const buttons = Array.from(container.querySelectorAll("button")).filter(
    (currentButton) => currentButton.getAttribute("aria-label") === label,
  );
  const button = buttons[index];

  expect(button).toBeTruthy();
  button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function changeSearchQuery(container: HTMLDivElement, value: string) {
  const input = container.querySelector<HTMLInputElement>(
    'input[placeholder="Search decks..."]',
  );

  expect(input).toBeTruthy();
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  expect(valueSetter).toBeTruthy();
  valueSetter?.call(input, value);
  input?.dispatchEvent(new Event("input", { bubbles: true }));
  input?.dispatchEvent(new Event("change", { bubbles: true }));
}

function getDeckRow(container: HTMLDivElement, deckId: string): HTMLElement {
  const row = container.querySelector<HTMLElement>(
    `[data-deck-row="true"][data-deck-id="${deckId}"]`,
  );

  expect(row).toBeTruthy();
  return row as HTMLElement;
}

function dispatchDragEvent(node: HTMLElement, type: string) {
  const DragEventCtor = globalThis.DragEvent ?? Event;
  node.dispatchEvent(
    new DragEventCtor(type, { bubbles: true, cancelable: true }),
  );
}

async function dragDeck(
  container: HTMLDivElement,
  sourceDeckId: string,
  targetDeckId: string,
) {
  await act(async () => {
    dispatchDragEvent(getDeckRow(container, sourceDeckId), "dragstart");
  });

  await act(async () => {
    dispatchDragEvent(getDeckRow(container, targetDeckId), "dragover");
  });

  await act(async () => {
    dispatchDragEvent(getDeckRow(container, targetDeckId), "drop");
  });
}

describe("DeckTreeSidebar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("shows the summed flashcard total on the all decks row", async () => {
    const nestedChild = {
      ...createDeckNode("child-1", 3),
      parentDeckId: "root-1",
      path: "root-1::child-1",
      children: [
        {
          ...createDeckNode("grandchild-1", 1),
          parentDeckId: "child-1",
          path: "root-1::child-1::grandchild-1",
        },
      ],
    };
    const deckTree: DeckTreeNode[] = [
      {
        ...createDeckNode("root-1", 6),
        children: [nestedChild],
      },
      createDeckNode("root-2", 4),
    ];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="statistics"
          selectedDeckId={undefined}
        />,
      );
    });

    const allDecksButton = Array.from(
      container.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("All Decks"));
    const divider = container.querySelector(
      '[data-testid="deck-tree-section-divider"]',
    );

    expect(allDecksButton).toBeTruthy();
    expect(allDecksButton?.textContent).toContain("10");
    expect(divider?.textContent).toContain("My Decks");
  });

  it("shows subtree flashcard counts for parent decks", async () => {
    const deckTree: DeckTreeNode[] = [
      {
        ...createDeckNode("root-1", 6, [
          {
            ...createDeckNode("child-1", 3, [
              {
                ...createDeckNode("grandchild-1", 1),
                parentDeckId: "child-1",
                path: "root-1::child-1::grandchild-1",
              },
            ]),
            parentDeckId: "root-1",
            path: "root-1::child-1",
          },
        ]),
        path: "root-1",
      },
    ];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="manage"
          selectedDeckId={undefined}
        />,
      );
    });

    expect(container.textContent).toContain("root-16");
  });

  it("keeps nested decks collapsed by default", async () => {
    const deckTree: DeckTreeNode[] = [
      {
        ...createDeckNode("root-1", 6, [
          {
            ...createDeckNode("child-1", 3),
            parentDeckId: "root-1",
            path: "root-1::child-1",
          },
        ]),
        path: "root-1",
      },
    ];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="manage"
          selectedDeckId={undefined}
        />,
      );
    });

    expect(container.querySelector('[title="root-1::child-1"]')).toBeNull();
  });

  it("toggles nested decks open and closed", async () => {
    const deckTree: DeckTreeNode[] = [
      {
        ...createDeckNode("root-1", 6, [
          {
            ...createDeckNode("child-1", 3),
            parentDeckId: "root-1",
            path: "root-1::child-1",
          },
        ]),
        path: "root-1",
      },
    ];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="manage"
          selectedDeckId={undefined}
        />,
      );
    });

    await act(async () => {
      clickButtonByLabel(container, "Expand deck");
    });

    expect(container.querySelector('[title="root-1::child-1"]')).toBeTruthy();

    await act(async () => {
      clickButtonByLabel(container, "Collapse deck");
    });

    expect(container.querySelector('[title="root-1::child-1"]')).toBeNull();
  });

  it("auto-expands ancestor decks for a selected nested deck", async () => {
    const deckTree: DeckTreeNode[] = [
      {
        ...createDeckNode("root-1", 6, [
          {
            ...createDeckNode("child-1", 3, [
              {
                ...createDeckNode("grandchild-1", 1),
                parentDeckId: "child-1",
                path: "root-1::child-1::grandchild-1",
              },
            ]),
            parentDeckId: "root-1",
            path: "root-1::child-1",
          },
        ]),
        path: "root-1",
      },
    ];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="manage"
          selectedDeckId="grandchild-1"
        />,
      );
    });

    expect(container.textContent).toContain("grandchild-1");
  });

  it("reveals matching nested decks while searching and restores the prior state when cleared", async () => {
    const deckTree: DeckTreeNode[] = [
      {
        ...createDeckNode("root-1", 6, [
          {
            ...createDeckNode("child-1", 3),
            parentDeckId: "root-1",
            path: "root-1::child-1",
          },
        ]),
        path: "root-1",
      },
    ];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="manage"
          selectedDeckId={undefined}
        />,
      );
    });

    expect(container.querySelector('[title="root-1::child-1"]')).toBeNull();

    await act(async () => {
      changeSearchQuery(container, "child");
    });

    expect(container.querySelector('[title="root-1::child-1"]')).toBeTruthy();

    await act(async () => {
      changeSearchQuery(container, "");
    });

    expect(container.querySelector('[title="root-1::child-1"]')).toBeNull();
  });

  it("moves a deck under another deck when dropped on its row", async () => {
    moveDeckMock.mockResolvedValueOnce({
      success: true,
      id: "deck-a",
      previousParentDeckId: null,
      newParentDeckId: "deck-b",
    });

    const deckTree: DeckTreeNode[] = [
      createDeckNode("deck-a", 2),
      {
        ...createDeckNode("deck-b", 4, [
          {
            ...createDeckNode("deck-c", 1),
            parentDeckId: "deck-b",
            path: "deck-b::deck-c",
          },
        ]),
        path: "deck-b",
      },
    ];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="manage"
          selectedDeckId={undefined}
        />,
      );
    });

    await dragDeck(container, "deck-a", "deck-b");

    expect(moveDeckMock).toHaveBeenCalledWith({
      id: "deck-a",
      parentDeckId: "deck-b",
    });
    expect(container.querySelector('[title="deck-b::deck-a"]')).toBeTruthy();
    expect(container.querySelector('[title="deck-b::deck-c"]')).toBeTruthy();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("moves a nested deck to root when dropped on the flashcards row", async () => {
    moveDeckMock.mockResolvedValueOnce({
      success: true,
      id: "child-1",
      previousParentDeckId: "root-1",
      newParentDeckId: null,
    });

    const deckTree: DeckTreeNode[] = [
      {
        ...createDeckNode("root-1", 5, [
          {
            ...createDeckNode("child-1", 2),
            parentDeckId: "root-1",
            path: "root-1::child-1",
          },
        ]),
        path: "root-1",
      },
    ];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="manage"
          selectedDeckId="child-1"
        />,
      );
    });

    await dragDeck(container, "child-1", "__flashcards_root__");

    expect(moveDeckMock).toHaveBeenCalledWith({ id: "child-1" });
    expect(container.querySelector('[title="child-1"]')).toBeTruthy();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("does not move a deck when dropped onto itself", async () => {
    const deckTree: DeckTreeNode[] = [createDeckNode("deck-a", 2)];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="manage"
          selectedDeckId={undefined}
        />,
      );
    });

    await dragDeck(container, "deck-a", "deck-a");

    expect(moveDeckMock).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("shows an error and leaves the tree unchanged when moving fails", async () => {
    moveDeckMock.mockResolvedValueOnce({
      success: false,
      errorCode: "decks.wouldCreateCycle",
      errorParams: undefined,
      errorMessage: undefined,
    });

    const deckTree: DeckTreeNode[] = [
      createDeckNode("deck-a", 2),
      createDeckNode("deck-b", 3),
    ];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="manage"
          selectedDeckId={undefined}
        />,
      );
    });

    await dragDeck(container, "deck-a", "deck-b");

    expect(moveDeckMock).toHaveBeenCalledWith({
      id: "deck-a",
      parentDeckId: "deck-b",
    });
    expect(toastErrorMock).toHaveBeenCalledWith(
      "This move would create a circular deck hierarchy.",
    );
    expect(container.querySelector('[title="deck-b::deck-a"]')).toBeNull();
    expect(container.querySelector('[title="deck-a"]')).toBeTruthy();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("refreshes after a deck is deleted", async () => {
    const deckTree: DeckTreeNode[] = [createDeckNode("root-1", 3)];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="manage"
          selectedDeckId={undefined}
        />,
      );
    });

    await act(async () => {
      clickButtonByText(container, "Delete deck");
    });

    expect(container.textContent).toContain("Confirm Delete");

    await act(async () => {
      clickButtonByText(container, "Confirm Delete");
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("Confirm Delete");
  });

  it("refreshes after a deck is renamed", async () => {
    const deckTree: DeckTreeNode[] = [createDeckNode("root-1", 3)];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="manage"
          selectedDeckId={undefined}
        />,
      );
    });

    await act(async () => {
      clickButtonByText(container, "Rename deck");
    });

    expect(container.textContent).toContain("Confirm Edit");

    await act(async () => {
      clickButtonByText(container, "Confirm Edit");
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("Confirm Edit");
  });

  it("does not redirect after a selected deck is deleted", async () => {
    const deckTree: DeckTreeNode[] = [createDeckNode("root-1", 3)];

    await act(async () => {
      root.render(
        <DeckTreeSidebar
          deckTree={deckTree}
          currentView="review"
          selectedDeckId="root-1"
        />,
      );
    });

    await act(async () => {
      clickButtonByText(container, "Delete deck");
    });

    await act(async () => {
      clickButtonByText(container, "Confirm Delete");
    });

    expect(replaceMock).not.toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
