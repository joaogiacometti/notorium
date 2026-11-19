import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardOptimizationCard } from "@/components/account/flashcard-optimization-card";
import { libraryKeys } from "@/lib/client-cache/queries";

const {
  optimizeFlashcardSchedulerMock,
  routerRefreshMock,
  resetFlashcardSchedulerOptimizationMock,
  toastErrorMock,
  toastSuccessMock,
  updateFsrsOptimizationPreferencesMock,
} = vi.hoisted(() => ({
  optimizeFlashcardSchedulerMock: vi.fn(),
  routerRefreshMock: vi.fn(),
  resetFlashcardSchedulerOptimizationMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  updateFsrsOptimizationPreferencesMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/app/actions/account", () => ({
  optimizeFlashcardScheduler: optimizeFlashcardSchedulerMock,
  resetFlashcardSchedulerOptimization: resetFlashcardSchedulerOptimizationMock,
  updateFsrsOptimizationPreferences: updateFsrsOptimizationPreferencesMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefreshMock,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    id,
    onCheckedChange,
  }: {
    checked: boolean;
    id?: string;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <button
      aria-pressed={checked}
      id={id}
      type="button"
      onClick={() => onCheckedChange(!checked)}
    />
  ),
}));

vi.mock("@/components/shared/action-confirmation-dialog", () => ({
  ActionConfirmationDialog: ({
    confirmLabel,
    confirmVariant,
    description,
    isPending,
    onConfirm,
    open,
    pendingLabel,
    title,
  }: {
    confirmLabel: string;
    confirmVariant: "default" | "destructive";
    description: string;
    isPending: boolean;
    onConfirm: () => void;
    open: boolean;
    pendingLabel: string;
    title: string;
  }) =>
    open ? (
      <div data-confirm-variant={confirmVariant} role="dialog">
        <h2>{title}</h2>
        <p>{description}</p>
        <button type="button" onClick={onConfirm} disabled={isPending}>
          {isPending ? pendingLabel : confirmLabel}
        </button>
      </div>
    ) : null,
}));

vi.mock("@/lib/read-api/account", () => ({
  fetchAccountSettings: vi.fn(() => new Promise(() => {})),
}));

vi.mock("@/lib/server/server-action-errors", () => ({
  resolveActionErrorMessage: () => "Could not optimize.",
}));

const settings = {
  automaticOptimizationEnabled: false,
  lastOptimizedAt: null,
  lastOptimizedOn: null,
  optimizedReviewCount: 0,
  reviewCount: 72,
};

describe("FlashcardOptimizationCard", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  function renderCard() {
    root.render(
      <QueryClientProvider client={queryClient}>
        <FlashcardOptimizationCard settings={settings} />
      </QueryClientProvider>,
    );
  }

  function isAccountSettingsInvalidated(): boolean {
    return (
      queryClient.getQueryState(libraryKeys.accountSettings)?.isInvalidated ??
      false
    );
  }

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient();
    queryClient.setQueryData(libraryKeys.accountSettings, {
      fsrsOptimization: settings,
    });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("runs manual optimization from the button", async () => {
    optimizeFlashcardSchedulerMock.mockResolvedValueOnce({
      success: true,
      optimizedReviewCount: 72,
      lastOptimizedAt: new Date("2026-05-08T00:00:00.000Z"),
    });

    await act(async () => {
      renderCard();
    });

    const button = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent === "Optimize now",
    );

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(optimizeFlashcardSchedulerMock).toHaveBeenCalledOnce();
    expect(toastSuccessMock).toHaveBeenCalledWith("Scheduler optimized.");
    expect(routerRefreshMock).toHaveBeenCalledOnce();
    // The dialog reads settings from the client cache, so "Last optimized"
    // only updates once that cache is refreshed.
    expect(isAccountSettingsInvalidated()).toBe(true);
  });

  it("resets optimization after confirmation", async () => {
    resetFlashcardSchedulerOptimizationMock.mockResolvedValueOnce({
      success: true,
    });

    await act(async () => {
      renderCard();
    });

    const resetButton = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent === "Reset to defaults",
    );
    await act(async () => {
      resetButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("data-confirm-variant")).toBe("destructive");
    expect(container.textContent).toContain("Reset to defaults");
    expect(container.textContent).toContain(
      "discard the current optimized FSRS tuning",
    );

    const confirmButton = container.querySelector<HTMLButtonElement>(
      '[role="dialog"] button',
    );
    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(resetFlashcardSchedulerOptimizationMock).toHaveBeenCalledOnce();
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Scheduler reset to defaults.",
    );
    expect(routerRefreshMock).toHaveBeenCalledOnce();
    expect(isAccountSettingsInvalidated()).toBe(true);
  });

  it("saves automatic optimization as soon as the switch changes", async () => {
    updateFsrsOptimizationPreferencesMock.mockResolvedValueOnce({
      success: true,
    });

    await act(async () => {
      renderCard();
    });

    const toggle = container.querySelector("#automatic-optimization-toggle");
    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(updateFsrsOptimizationPreferencesMock).toHaveBeenCalledWith({
      automaticOptimizationEnabled: true,
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Automatic optimization turned on.",
    );
    expect(toggle?.getAttribute("aria-pressed")).toBe("true");
    expect(isAccountSettingsInvalidated()).toBe(true);
  });

  it("reverts the switch when saving automatic optimization fails", async () => {
    updateFsrsOptimizationPreferencesMock.mockResolvedValueOnce({
      success: false,
      error: "Couldn't save.",
    });

    await act(async () => {
      renderCard();
    });

    const toggle = container.querySelector("#automatic-optimization-toggle");
    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(toastErrorMock).toHaveBeenCalledOnce();
    expect(toggle?.getAttribute("aria-pressed")).toBe("false");
    expect(isAccountSettingsInvalidated()).toBe(false);
  });
});
