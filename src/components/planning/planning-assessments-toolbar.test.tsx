import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningAssessmentsToolbar } from "@/components/planning/planning-assessments-toolbar";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const baseProps = {
  selectedAssessmentIds: [],
  total: 12,
  onClearSelection: vi.fn(),
  onOpenBulkDeleteDialog: vi.fn(),
  onOpenMarkCompletedDialog: vi.fn(),
  onOpenMarkPendingDialog: vi.fn(),
};

describe("PlanningAssessmentsToolbar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
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

  it("shows the results count when nothing is selected", async () => {
    await act(async () => {
      root.render(<PlanningAssessmentsToolbar {...baseProps} />);
    });

    expect(container.textContent).toContain("12 items");
    expect(
      container.querySelector('button[aria-label="Mark Completed"]'),
    ).toBeFalsy();
  });

  it("shows selection actions and tooltips when assessments are selected", async () => {
    await act(async () => {
      root.render(
        <PlanningAssessmentsToolbar
          {...baseProps}
          selectedAssessmentIds={["assessment-1", "assessment-2"]}
        />,
      );
    });

    const markCompletedButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Mark Completed"]',
    );
    const markPendingButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Mark Pending"]',
    );
    const deleteButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Delete"]',
    );
    const clearSelectionButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Clear selection"]',
    );

    expect(container.textContent).toContain("2 selected");
    expect(markCompletedButton).toBeTruthy();
    expect(markPendingButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();
    expect(clearSelectionButton).toBeTruthy();

    await act(async () => {
      markCompletedButton?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain("Mark Completed");

    await act(async () => {
      markPendingButton?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain("Mark Pending");

    await act(async () => {
      deleteButton?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain("Delete");

    await act(async () => {
      clearSelectionButton?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain("Clear selection");
  });
});
