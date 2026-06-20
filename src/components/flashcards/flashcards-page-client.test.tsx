import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ComponentProps } from "react";
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
  useTransition: () => [false, vi.fn()],
}));

vi.mock("@/components/flashcards/manage/flashcards-manager", () => ({
  FlashcardsManager: () => <div data-testid="flashcards-manager" />,
}));

vi.mock("@/components/flashcards/review/flashcard-review-client", () => ({
  FlashcardReviewClient: () => <div data-testid="flashcard-review" />,
}));

vi.mock("@/components/flashcards/shared/flashcards-statistics", () => ({
  FlashcardsStatistics: () => <div data-testid="flashcards-statistics" />,
}));

const mockManagePageData: import("@/lib/server/api-contracts").FlashcardManagePage =
  {
    items: [],
    total: 0,
    subjectCardCount: null,
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
    heatmap: [],
    streak: { current: 0, longest: 0 },
  };

const mockSubjects: import("@/lib/server/api-contracts").SubjectOption[] = [
  {
    id: "subject-1",
    name: "Database 1",
    path: "CS::Database 1",
    kind: "general",
    totalClasses: null,
    maxMisses: null,
    userId: "user-1",
    parentSubjectId: "subject-parent",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

const defaultProps: ComponentProps<typeof FlashcardsPageClient> = {
  currentView: "manage",
  scopedSubjectId: undefined,
  initialPageSize: 25,
  subjects: mockSubjects,
  initialManagePageData: mockManagePageData,
  initialReviewState: mockReviewState,
  statistics: mockStatistics,
  aiEnabled: false,
};

describe("FlashcardsPageClient", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  function render(props: Partial<typeof defaultProps> = {}) {
    return act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <FlashcardsPageClient {...defaultProps} {...props} />
        </QueryClientProvider>,
      );
    });
  }

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("always shows the subject scope filter and no deck tree", async () => {
    await render();

    expect(
      container.querySelector('[data-testid="subject-scope-filter"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="deck-tree-sidebar"]'),
    ).toBeNull();
  });

  it("renders the manager on the manage view", async () => {
    await render();

    expect(
      container.querySelector('[data-testid="flashcards-manager"]'),
    ).toBeTruthy();
  });

  it("renders the review client on the review view", async () => {
    await render({ currentView: "review", scopedSubjectId: "subject-1" });

    expect(
      container.querySelector('[data-testid="flashcard-review"]'),
    ).toBeTruthy();
  });

  it("renders statistics on the statistics view", async () => {
    await render({ currentView: "statistics", scopedSubjectId: "subject-1" });

    expect(
      container.querySelector('[data-testid="flashcards-statistics"]'),
    ).toBeTruthy();
  });
});
