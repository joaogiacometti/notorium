import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeckTreeSidebar } from "@/components/decks/deck-tree-sidebar";
import type { DeckEntity, DeckTreeNode } from "@/lib/server/api-contracts";

const { replaceMock, refreshMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

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
      description: string | null;
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
            description: deck.description,
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
    description: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    flashcardCount,
    children,
    path: id,
  };
}

function clickButtonByText(
  container: HTMLDivElement,
  text: string,
  index = 0,
) {
  const buttons = Array.from(container.querySelectorAll("button")).filter(
    (currentButton) => currentButton.textContent?.includes(text),
  );
  const button = buttons[index];

  expect(button).toBeTruthy();
  button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

  it("shows the summed flashcard total on the root row", async () => {
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

    const flashcardsButton = Array.from(
      container.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Flashcards"));

    expect(flashcardsButton).toBeTruthy();
    expect(flashcardsButton?.textContent).toContain("10");
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
