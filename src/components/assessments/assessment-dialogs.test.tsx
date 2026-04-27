import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditAssessmentDialog } from "@/components/assessments/edit-assessment-dialog";
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
});
