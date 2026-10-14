import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditAssessmentDialog } from "@/components/assessments/edit-assessment-dialog";
import { ManagerDataTable } from "@/components/shared/manager-data-table";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const editAssessmentMock = vi.fn();

vi.mock("@/app/actions/assessments", () => ({
  editAssessment: (...args: unknown[]) => editAssessmentMock(...args),
}));

function createAssessmentEntity(
  overrides: Partial<AssessmentEntity> = {},
): AssessmentEntity {
  return {
    id: "assessment-1",
    title: "Midterm 1",
    description: null,
    type: "exam",
    status: "pending",
    dueDate: "2026-05-01",
    score: null,
    weight: null,
    subjectId: "subject-1",
    userId: "user-1",
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
    ...overrides,
  };
}

describe("assessment dialogs", () => {
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
    document.body.textContent = "";
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("does not render attachment controls in the edit dialog", async () => {
    await act(async () => {
      root.render(
        <EditAssessmentDialog
          assessment={createAssessmentEntity()}
          open
          onOpenChange={() => {}}
        />,
      );
    });

    expect(document.body.textContent).toContain("Edit Assessment");
    expect(document.body.textContent).not.toContain("Attachments");
    expect(document.body.textContent).not.toContain("Add Files");
  });

  it("blocks background row navigation after changing status in the real dialog", async () => {
    const onRowClick = vi.fn();
    await act(async () => {
      root.render(
        <>
          <ManagerDataTable
            data={[createAssessmentEntity({ id: "other-assessment" })]}
            columns={[{ accessorKey: "title", header: "Title" }]}
            getRowId={(assessment) => assessment.id}
            onRowClick={onRowClick}
            onPageIndexChange={() => {}}
            pageIndex={0}
            pageLabel={(current, total) => `Page ${current} of ${total}`}
            prevLabel="Previous"
            nextLabel="Next"
            emptyLabel="No assessments"
          />
          <EditAssessmentDialog
            assessment={createAssessmentEntity()}
            open
            onOpenChange={() => {}}
          />
        </>,
      );
    });
    const statusTrigger = document.querySelector(
      "#form-edit-assessment-status",
    );
    await act(async () => {
      statusTrigger?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    const completedOption = document.querySelector(
      '[role="option"]:last-child',
    );
    expect(completedOption?.textContent).toBe("Completed");
    await act(async () => {
      completedOption?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(statusTrigger?.textContent).toBe("Completed");
    // A click retargeted to another row must remain blocked behind the modal.
    await act(async () => {
      container
        .querySelector("tbody td")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onRowClick).not.toHaveBeenCalled();
    expect(editAssessmentMock).not.toHaveBeenCalled();
  });
});
