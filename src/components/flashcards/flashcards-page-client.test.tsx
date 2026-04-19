import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardsPageClient } from "./flashcards-page-client";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function createStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/flashcards",
  useTransition: () => [vi.fn(), vi.fn()],
}));

vi.mock("@/components/decks/create-deck-dialog", () => ({
  CreateDeckDialog: ({ trigger }: { trigger: React.ReactNode }) => trigger,
}));

vi.mock("@/components/decks/edit-deck-dialog", () => ({
  EditDeckDialog: ({
    deck,
    open,
    onSaved,
    onOpenChange,
  }: {
    deck: { id: string; name: string };
    open: boolean;
    onSaved?: (deck: { id: string; name: string }) => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onSaved?.({ id: deck.id, name: "Renamed" })}>
        Confirm
      </button>
    ) : null,
}));

vi.mock("@/components/decks/delete-deck-dialog", () => ({
  DeleteDeckDialog: ({
    deckId,
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
        <button type="button" onClick={() => onDeleted?.(deckId)}>
          Confirm Delete
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/flashcards/manage/flashcards-manager", () => ({
  FlashcardsManager: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="flashcards-manager">{children}</div>
  ),
}));

vi.mock("@/components/flashcards/review/flashcard-review-client", () => ({
  FlashcardReviewClient: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="flashcard-review">{children}</div>
  ),
}));

vi.mock("@/components/flashcards/shared/flashcards-statistics", () => ({
  FlashcardsStatistics: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="flashcards-statistics">{children}</div>
  ),
}));

vi.mock("@/components/decks/deck-tree-sidebar", () => ({
  DeckTreeSidebar: ({ children }: { children?: React.ReactNode }) => (
    <aside data-testid="deck-tree-sidebar">{children}</aside>
  ),
}));

const mockManagePageData: import("@/lib/server/api-contracts").FlashcardManagePage = {
  items: [],
  total: 0,
  deckCardCount: null,
};

const mockReviewState: import("@/lib/server/api-contracts").FlashcardReviewState = {
  cards: [],
  summary: { dueCount: 0, totalCount: 0 },
  scheduler: { desiredRetention: 0.9, weights: [0.4, 0.6, 2.4, 5.8, 4.9, 0.9, 0.9, 2.4, 4.9, 6.7] },
};

const mockStatistics: import("@/lib/server/api-contracts").FlashcardStatisticsState = {
  summary: {
    totalCards: 0,
    dueCards: 0,
    reviewedCards: 0,
    neverReviewedCards: 0,
    totalReviews: 0,
    totalLapses: 0,
    averageReviewsPerCard: 0,
    averageLapsesPerReviewedCard: 0,
  },
  states: [],
  ratings: [],
  trend: [],
};

const mockDeckTree: import("@/lib/server/api-contracts").DeckTreeNode[] = [];
const mockDecks: import("@/lib/server/api-contracts").DeckEntity[] = [];

const defaultProps = {
  currentView: "manage" as const,
  scopedDeckId: undefined,
  deckTree: mockDeckTree,
  decks: mockDecks,
  initialManagePageData: mockManagePageData,
  initialReviewState: mockReviewState,
  statistics: mockStatistics,
  aiEnabled: false,
};

describe("FlashcardsPageClient", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    Object.defineProperty(window, "localStorage", {
      value: createStorageMock(),
      configurable: true,
    });
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("defaults to visible on first load", async () => {
    await act(async () => {
      root.render(<FlashcardsPageClient {...defaultProps} />);
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeTruthy();
  });

  it("restores persisted state from localStorage", async () => {
    window.localStorage.setItem("flashcards-sidebar-visible", "false");

    await act(async () => {
      root.render(<FlashcardsPageClient {...defaultProps} />);
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeNull();
  });

  it("Ctrl+B toggles sidebar visible to hidden", async () => {
    await act(async () => {
      root.render(<FlashcardsPageClient {...defaultProps} />);
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeTruthy();

    await act(async () => {
      const event = new KeyboardEvent("keydown", {
        key: "b",
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
      vi.runAllTimers();
    });

    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeNull();
  });

  it("Ctrl+B toggles sidebar hidden to visible", async () => {
    window.localStorage.setItem("flashcards-sidebar-visible", "false");

    await act(async () => {
      root.render(<FlashcardsPageClient {...defaultProps} />);
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeNull();

    await act(async () => {
      const event = new KeyboardEvent("keydown", {
        key: "b",
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
      vi.runAllTimers();
    });

    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeTruthy();
  });

  it("persists toggle to localStorage", async () => {
    await act(async () => {
      root.render(<FlashcardsPageClient {...defaultProps} />);
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(window.localStorage.getItem("flashcards-sidebar-visible")).toBeNull();

    const event = new KeyboardEvent("keydown", {
      key: "b",
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    act(() => {
      vi.runAllTimers();
    });

    expect(window.localStorage.getItem("flashcards-sidebar-visible")).toBe("false");
  });

  it("ignores shortcut when input is focused", async () => {
    await act(async () => {
      root.render(
        <div>
          <input type="text" data-testid="test-input" />
          <FlashcardsPageClient {...defaultProps} />
        </div>,
      );
    });

    act(() => {
      vi.runAllTimers();
    });

    const input = container.querySelector(
      '[data-testid="test-input"]',
    ) as HTMLInputElement;
    input?.focus();

    const event = new KeyboardEvent("keydown", {
      key: "b",
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    act(() => {
      vi.runAllTimers();
    });

    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeTruthy();
  });

  it("ignores shortcut when modifier keys other than ctrl are pressed", async () => {
    await act(async () => {
      root.render(<FlashcardsPageClient {...defaultProps} />);
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeTruthy();

    const event = new KeyboardEvent("keydown", {
      key: "b",
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    act(() => {
      vi.runAllTimers();
    });

    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeTruthy();
  });
});
