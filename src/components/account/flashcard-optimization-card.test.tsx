import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlashcardOptimizationCard } from "@/components/account/flashcard-optimization-card";

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

vi.mock("@/lib/server/server-action-errors", () => ({
  resolveActionErrorMessage: () => "Could not optimize.",
}));

const settings = {
  automaticOptimizationEnabled: false,
  lastOptimizedAt: null,
  optimizedReviewCount: 0,
  reviewCount: 72,
};

describe("FlashcardOptimizationCard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("hides automatic optimization controls when workflows are disabled", async () => {
    await act(async () => {
      root.render(
        <FlashcardOptimizationCard
          settings={settings}
          workflowsEnabled={false}
        />,
      );
    });

    expect(container.textContent).toContain("Last optimized:");
    expect(container.textContent).toContain("Never optimized");
    expect(container.textContent).not.toContain("Optimized with");
    expect(container.textContent).not.toContain("Review history");
    expect(container.textContent).not.toContain("Automatic optimization");
  });

  it("runs manual optimization from the button", async () => {
    optimizeFlashcardSchedulerMock.mockResolvedValueOnce({
      success: true,
      optimizedReviewCount: 72,
      lastOptimizedAt: new Date("2026-05-08T00:00:00.000Z"),
    });

    await act(async () => {
      root.render(
        <FlashcardOptimizationCard settings={settings} workflowsEnabled />,
      );
    });

    const button = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent === "Optimize now",
    );

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(optimizeFlashcardSchedulerMock).toHaveBeenCalledOnce();
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "FSRS optimization completed.",
    );
    expect(routerRefreshMock).toHaveBeenCalledOnce();
  });

  it("resets optimization after confirmation", async () => {
    resetFlashcardSchedulerOptimizationMock.mockResolvedValueOnce({
      success: true,
    });

    await act(async () => {
      root.render(
        <FlashcardOptimizationCard settings={settings} workflowsEnabled />,
      );
    });

    const resetButton = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent === "Reset",
    );
    await act(async () => {
      resetButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("data-confirm-variant")).toBe("destructive");
    expect(container.textContent).toContain("Reset Optimization");
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
    expect(toastSuccessMock).toHaveBeenCalledWith("FSRS optimization reset.");
    expect(routerRefreshMock).toHaveBeenCalledOnce();
  });

  it("enables the automatic optimization save action after the switch changes", async () => {
    await act(async () => {
      root.render(
        <FlashcardOptimizationCard settings={settings} workflowsEnabled />,
      );
    });

    const saveButton = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent === "Save Preferences",
    );

    expect(saveButton).toBeTruthy();
    expect(saveButton?.hasAttribute("disabled")).toBe(true);

    const toggle = container.querySelector("#automatic-optimization-toggle");
    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(saveButton?.hasAttribute("disabled")).toBe(false);
  });

  it("saves automatic optimization preferences", async () => {
    updateFsrsOptimizationPreferencesMock.mockResolvedValueOnce({
      success: true,
    });

    await act(async () => {
      root.render(
        <FlashcardOptimizationCard settings={settings} workflowsEnabled />,
      );
    });

    const toggle = container.querySelector("#automatic-optimization-toggle");
    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const saveButton = Array.from(container.querySelectorAll("button")).find(
      (element) => element.textContent === "Save Preferences",
    );
    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(updateFsrsOptimizationPreferencesMock).toHaveBeenCalledWith({
      automaticOptimizationEnabled: true,
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "FSRS optimization preferences saved.",
    );
  });
});
