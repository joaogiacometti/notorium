import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFlashcardsManagerController } from "@/components/flashcards/manage/use-flashcards-manager-controller";
import { fetchFlashcardForManage } from "@/lib/read-api/flashcards";
import type {
  FlashcardEntity,
  FlashcardManagePage,
} from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

type ManagerController = ReturnType<typeof useFlashcardsManagerController>;

const getRefineFlashcardGroupsMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/flashcards",
}));

vi.mock("@/app/actions/flashcards", () => ({
  validateFlashcards: vi.fn(),
}));

vi.mock("@/lib/read-api/flashcards", () => ({
  fetchFlashcardForManage: vi.fn(),
  fetchFlashcardsManagePage: vi
    .fn()
    .mockResolvedValue({ items: [], total: 0, subjectCardCount: null }),
  fetchRefineFlashcardGroups: getRefineFlashcardGroupsMock,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

const emptyPageData: FlashcardManagePage = {
  items: [],
  total: 0,
  subjectCardCount: null,
};

function ControllerHarness({
  onController,
}: Readonly<{ onController: (controller: ManagerController) => void }>) {
  const controller = useFlashcardsManagerController({
    initialPageData: emptyPageData,
    initialPageSize: 25,
  });

  onController(controller);
  return null;
}

describe("useFlashcardsManagerController refine mode", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;
  let controller: ManagerController;

  async function renderController() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ControllerHarness
            onController={(nextController) => {
              controller = nextController;
            }}
          />
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

  it("loads groups and enters refine mode on start", async () => {
    const groups = {
      mastered: [],
      struggling: [],
    };
    getRefineFlashcardGroupsMock.mockResolvedValue({ success: true, groups });

    await renderController();

    expect(controller.refineMode).toBe(false);

    await act(async () => {
      await controller.startRefineMode();
    });

    expect(controller.refineMode).toBe(true);
    expect(controller.refineGroups).toEqual(groups);
    expect(controller.isLoadingRefineGroups).toBe(false);
  });

  it("stays out of refine mode and toasts when loading fails", async () => {
    getRefineFlashcardGroupsMock.mockResolvedValue({
      success: false,
      errorCode: "auth.required",
    });

    await renderController();

    await act(async () => {
      await controller.startRefineMode();
    });

    expect(controller.refineMode).toBe(false);
    expect(toastMock.error).toHaveBeenCalledOnce();
  });

  it("stays out of refine mode and toasts when the request itself fails", async () => {
    getRefineFlashcardGroupsMock.mockRejectedValue(new TypeError("offline"));

    await renderController();

    await act(async () => {
      await controller.startRefineMode();
    });

    expect(controller.refineMode).toBe(false);
    expect(controller.isLoadingRefineGroups).toBe(false);
    expect(toastMock.error).toHaveBeenCalledOnce();
  });

  it("clears refine state on exit", async () => {
    getRefineFlashcardGroupsMock.mockResolvedValue({
      success: true,
      groups: { mastered: [], struggling: [] },
    });

    await renderController();

    await act(async () => {
      await controller.startRefineMode();
    });
    expect(controller.refineMode).toBe(true);

    await act(async () => {
      controller.exitRefine();
    });

    expect(controller.refineMode).toBe(false);
    expect(controller.refineGroups).toEqual({ mastered: [], struggling: [] });
  });

  it("exits refine mode when validation starts", async () => {
    getRefineFlashcardGroupsMock.mockResolvedValue({
      success: true,
      groups: { mastered: [], struggling: [] },
    });

    await renderController();

    await act(async () => {
      await controller.startRefineMode();
    });
    expect(controller.refineMode).toBe(true);

    await act(async () => {
      controller.handleValidationStarted([], []);
    });

    expect(controller.refineMode).toBe(false);
    expect(controller.validationMode).toBe(true);
  });
});

describe("useFlashcardsManagerController validation refresh", () => {
  let container: HTMLDivElement;
  let root: Root;
  let controller: ManagerController;
  const validationCard = {
    id: "card-1",
    front: "Old front",
    subjectName: "Biology",
    subjectPath: "Science::Biology",
    subjectId: "subject-1",
  };

  async function renderWithValidationCard() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <ControllerHarness
            onController={(nextController) => {
              controller = nextController;
            }}
          />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      controller.handleValidationStarted([], [validationCard]);
    });
  }

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

  it("updates the edited card's row from the saved flashcard", async () => {
    vi.mocked(fetchFlashcardForManage).mockResolvedValueOnce({
      flashcard: {
        id: "card-1",
        front: "New front",
        subjectId: "subject-2",
      } as FlashcardEntity,
    });
    await renderWithValidationCard();

    await act(async () => {
      await controller.refreshValidationFlashcard("card-1");
    });

    expect(controller.validationFlashcards).toEqual([
      { ...validationCard, front: "New front", subjectId: "subject-2" },
    ]);
  });

  it("keeps the existing row when the refresh request fails", async () => {
    vi.mocked(fetchFlashcardForManage).mockRejectedValueOnce(
      new TypeError("offline"),
    );
    await renderWithValidationCard();

    await act(async () => {
      await controller.refreshValidationFlashcard("card-1");
    });

    expect(controller.validationFlashcards).toEqual([validationCard]);
  });
});
