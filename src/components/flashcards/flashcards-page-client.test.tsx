import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardsPageClient } from "./flashcards-page-client";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

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
  }: {
    deck: { id: string; name: string };
    open: boolean;
    onSaved?: (deck: { id: string; name: string }) => void;
  }) =>
    open ? (
      <button
        type="button"
        onClick={() => onSaved?.({ id: deck.id, name: "Renamed" })}
      >
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
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) =>
    children,
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
  DeckTreeSidebar: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <aside className={className} data-testid="deck-tree-sidebar">
      {children}
    </aside>
  ),
}));

const mockManagePageData: import("@/lib/server/api-contracts").FlashcardManagePage =
  {
    items: [],
    total: 0,
    deckCardCount: null,
  };

const mockReviewState: import("@/lib/server/api-contracts").FlashcardReviewState =
  {
    cards: [],
    summary: { dueCount: 0, totalCount: 0 },
    scheduler: {
      desiredRetention: 0.9,
      weights: [0.4, 0.6, 2.4, 5.8, 4.9, 0.9, 0.9, 2.4, 4.9, 6.7],
    },
  };

const mockStatistics: import("@/lib/server/api-contracts").FlashcardStatisticsState =
  {
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
const mockDecks: import("@/lib/server/api-contracts").DeckOption[] = [
  {
    id: "deck-1",
    name: "Database 1",
    path: "CS::Database 1",
    userId: "user-1",
    parentDeckId: "deck-parent",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "deck-2",
    name: "Network",
    path: "CS::Network",
    userId: "user-1",
    parentDeckId: "deck-parent",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

const defaultProps = {
  currentView: "manage" as const,
  scopedDeckId: undefined,
  initialPageSize: 25,
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
  let queryClient: QueryClient;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient();
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

  it("renders sidebar always visible", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <FlashcardsPageClient {...defaultProps} />
        </QueryClientProvider>,
      );
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeTruthy();
  });

  it("keeps the deck sidebar available on manage view", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <FlashcardsPageClient {...defaultProps} />
        </QueryClientProvider>,
      );
    });

    const sidebar = container.querySelector(
      '[data-testid="deck-tree-sidebar"]',
    );

    expect(sidebar?.className).not.toContain("hidden lg:block");
    expect(
      container.querySelector('[data-testid="mobile-deck-scope-picker"]'),
    ).toBeNull();
  });

  it("uses a compact mobile scope picker on review view", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <FlashcardsPageClient
            {...defaultProps}
            currentView="review"
            scopedDeckId="deck-1"
          />
        </QueryClientProvider>,
      );
    });

    const sidebar = container.querySelector(
      '[data-testid="deck-tree-sidebar"]',
    );
    const scopePicker = container.querySelector(
      '[data-testid="mobile-deck-scope-picker"]',
    );

    expect(sidebar?.className).toContain("hidden lg:block");
    expect(scopePicker).toBeTruthy();
    expect(scopePicker?.textContent).toContain("CS::Database 1");
  });

  it("uses a compact mobile scope picker on statistics view", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <FlashcardsPageClient
            {...defaultProps}
            currentView="statistics"
            scopedDeckId="deck-2"
          />
        </QueryClientProvider>,
      );
    });

    const sidebar = container.querySelector(
      '[data-testid="deck-tree-sidebar"]',
    );
    const scopePicker = container.querySelector(
      '[data-testid="mobile-deck-scope-picker"]',
    );

    expect(sidebar?.className).toContain("hidden lg:block");
    expect(scopePicker).toBeTruthy();
    expect(scopePicker?.textContent).toContain("CS::Network");
  });
});
