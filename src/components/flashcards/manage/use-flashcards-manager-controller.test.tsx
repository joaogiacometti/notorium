import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFlashcardsManagerController } from "@/components/flashcards/manage/use-flashcards-manager-controller";
import type { FlashcardManagePage } from "@/lib/server/api-contracts";

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
  getFlashcardForManage: vi.fn(),
  getFlashcardsManagePage: vi
    .fn()
    .mockResolvedValue({ items: [], total: 0, deckCardCount: null }),
  validateFlashcards: vi.fn(),
}));

vi.mock("@/app/actions/flashcards-refine", () => ({
  getRefineFlashcardGroups: getRefineFlashcardGroupsMock,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

const emptyPageData: FlashcardManagePage = {
  items: [],
  total: 0,
  deckCardCount: null,
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
