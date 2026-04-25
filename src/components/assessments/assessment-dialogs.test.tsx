import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateAssessmentDialog } from "@/components/assessments/create-assessment-dialog";
import { EditAssessmentDialog } from "@/components/assessments/edit-assessment-dialog";
import type {
  AssessmentEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const createAssessmentMock = vi.fn();
const editAssessmentMock = vi.fn();
const uploadAssessmentFilesMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/app/actions/assessments", () => ({
  createAssessment: (...args: unknown[]) => createAssessmentMock(...args),
  editAssessment: (...args: unknown[]) => editAssessmentMock(...args),
}));

vi.mock("@/components/assessments/assessment-attachment-actions", () => ({
  uploadAssessmentFiles: (...args: unknown[]) =>
    uploadAssessmentFilesMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
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

function createSubject(overrides: Partial<SubjectEntity> = {}): SubjectEntity {
  return {
    id: "subject-1",
    name: "Math",
    description: null,
    totalClasses: null,
    maxMisses: null,
    archivedAt: null,
    userId: "user-1",
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
    ...overrides,
  };
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  expect(valueSetter).toBeTruthy();
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
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

  it("keeps attachments available while creating an assessment", async () => {
    await act(async () => {
      root.render(
        <CreateAssessmentDialog
          open
          onOpenChange={() => {}}
          subjects={[createSubject()]}
        />,
      );
    });

    expect(document.body.textContent).toContain("Attachments");
    expect(document.body.textContent).toContain("Add Files");
  });

  it("keeps create dialog open with selected files when upload fails", async () => {
    const onOpenChange = vi.fn();
    createAssessmentMock.mockResolvedValue({
      success: true,
      assessment: createAssessmentEntity(),
    });
    uploadAssessmentFilesMock.mockResolvedValue({
      success: false,
      errorCode: "attachments.uploadFailed",
      errorParams: undefined,
      errorMessage: undefined,
      attachments: [],
      completedFileCount: 0,
    });

    await act(async () => {
      root.render(
        <CreateAssessmentDialog
          open
          onOpenChange={onOpenChange}
          subjectId="subject-1"
        />,
      );
    });

    const titleInput = document.body.querySelector<HTMLInputElement>(
      "#form-create-assessment-title",
    );
    const fileInput = document.body.querySelector<HTMLInputElement>(
      "#form-create-assessment-attachments",
    );
    const button = document.body.querySelector<HTMLButtonElement>(
      'button[form="form-create-assessment"]',
    );

    await act(async () => {
      if (titleInput) {
        setInputValue(titleInput, "Midterm 1");
      }
    });

    Object.defineProperty(fileInput, "files", {
      value: [new File(["notes"], "selected.pdf")],
      configurable: true,
    });

    await act(async () => {
      fileInput?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("selected.pdf");

    await act(async () => {
      button?.click();
    });

    expect(uploadAssessmentFilesMock).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(document.body.textContent).toContain("selected.pdf");
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to upload attachment.");
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
