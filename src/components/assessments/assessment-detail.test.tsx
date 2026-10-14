import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadAssessmentFiles } from "@/components/assessments/assessment-attachment-actions";
import { AssessmentDetail } from "@/components/assessments/assessment-detail";
import type {
  AssessmentAttachmentEntity,
  AssessmentDetailEntity,
  AssessmentEntity,
} from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/components/assessments/assessment-attachment-actions", () => ({
  uploadAssessmentFiles: vi.fn(),
}));

vi.mock("@/components/assessments/lazy-edit-assessment-dialog", () => ({
  LazyEditAssessmentDialog: () => null,
}));

vi.mock("@/components/assessments/delete-assessment-dialog", () => ({
  DeleteAssessmentDialog: () => null,
}));

vi.mock("@/components/assessments/delete-assessment-attachment-dialog", () => ({
  DeleteAssessmentAttachmentDialog: () => null,
}));

// Keep the due date in the future so the derived status stays "Pending"
// regardless of when the suite runs (status is computed from the current date).
function futureDueDateIso(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function createAssessmentEntity(): AssessmentEntity {
  return {
    id: "assessment-1",
    title: "Midterm 1",
    description: null,
    type: "exam",
    status: "pending",
    dueDate: futureDueDateIso(),
    score: null,
    weight: null,
    subjectId: "subject-1",
    userId: "user-1",
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  };
}

function createAssessmentAttachment(): AssessmentAttachmentEntity {
  return {
    id: "attachment-1",
    assessmentId: "assessment-1",
    userId: "user-1",
    fileName: "study-guide.pdf",
    blobPathname: "notorium/assessments/user-1/study-guide.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  };
}

function createAssessmentDetail(): AssessmentDetailEntity {
  return {
    assessment: createAssessmentEntity(),
    subject: {
      id: "subject-1",
      name: "Math",
    },
    attachments: [createAssessmentAttachment()],
  };
}

describe("AssessmentDetail", () => {
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

  async function renderDetail(attachmentsEnabled: boolean) {
    await act(async () => {
      root.render(
        <AssessmentDetail
          attachmentsEnabled={attachmentsEnabled}
          breadcrumb={[
            { label: "Planning", href: "/planning" },
            { label: "Final exam" },
          ]}
          returnHref="/planning"
          detail={createAssessmentDetail()}
        />,
      );
    });
  }

  it("renders attachments section when attachments are enabled", async () => {
    await renderDetail(true);

    expect(container.textContent).toContain("Attachments");
  });

  it("hides attachments section when attachments are disabled", async () => {
    await renderDetail(false);

    const text = container.textContent;
    expect(text).not.toContain("Add files");
  });

  it("shows the assessment title", async () => {
    await renderDetail(true);

    expect(container.textContent).toContain("Midterm 1");
  });

  it("shows the subject name in the details card", async () => {
    await renderDetail(true);

    expect(container.textContent).toContain("Math");
  });

  it("shows the type label in the details card", async () => {
    await renderDetail(true);

    expect(container.textContent).toContain("Exam");
  });

  it("shows status pill", async () => {
    await renderDetail(true);

    expect(container.textContent).toContain("Pending");
  });

  it("shows description empty state when description is null", async () => {
    await renderDetail(true);

    expect(container.textContent).toContain("Add a description");
  });

  it("shows description text when description is present", async () => {
    const detail = createAssessmentDetail();
    detail.assessment.description = "Covers chapters 1 through 5.";

    await act(async () => {
      root.render(
        <AssessmentDetail
          attachmentsEnabled={false}
          breadcrumb={[
            { label: "Planning", href: "/planning" },
            { label: "Midterm" },
          ]}
          returnHref="/planning"
          detail={detail}
        />,
      );
    });

    expect(container.textContent).toContain("Covers chapters 1 through 5.");
  });

  it("shows no-score state when score is null", async () => {
    await renderDetail(true);

    expect(container.textContent).toContain("No score yet");
  });

  it("shows score readout when score is present", async () => {
    const detail = createAssessmentDetail();
    detail.assessment.score = "85";

    await act(async () => {
      root.render(
        <AssessmentDetail
          attachmentsEnabled={false}
          breadcrumb={[
            { label: "Planning", href: "/planning" },
            { label: "Midterm" },
          ]}
          returnHref="/planning"
          detail={detail}
        />,
      );
    });

    expect(container.textContent).toContain("85");
    expect(container.textContent).toContain("85%");
  });

  it("shows attachment file name when attachments exist", async () => {
    await renderDetail(true);

    expect(container.textContent).toContain("study-guide.pdf");
  });

  it("shows dropzone when attachments list is empty", async () => {
    const detail = createAssessmentDetail();
    detail.attachments = [];

    await act(async () => {
      root.render(
        <AssessmentDetail
          attachmentsEnabled={true}
          breadcrumb={[
            { label: "Planning", href: "/planning" },
            { label: "Midterm" },
          ]}
          returnHref="/planning"
          detail={detail}
        />,
      );
    });

    expect(container.textContent).toContain(
      "Drag files here or click to upload",
    );
  });

  async function renderEmptyDetail() {
    const detail = createAssessmentDetail();
    detail.attachments = [];

    await act(async () => {
      root.render(
        <AssessmentDetail
          attachmentsEnabled={true}
          breadcrumb={[
            { label: "Planning", href: "/planning" },
            { label: "Midterm" },
          ]}
          returnHref="/planning"
          detail={detail}
        />,
      );
    });
  }

  async function triggerUpload(file: File) {
    const input = container.querySelector<HTMLInputElement>(
      "#assessment-detail-attachments",
    );
    if (!input) {
      throw new Error("attachment file input not rendered");
    }
    Object.defineProperty(input, "files", {
      value: [file],
      configurable: true,
    });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    // Flush the fire-and-forget upload promise and its state updates.
    await act(async () => {
      await Promise.resolve();
    });
  }

  it("appends uploaded attachments on success", async () => {
    vi.mocked(uploadAssessmentFiles).mockResolvedValue({
      success: true,
      attachments: [createAssessmentAttachment()],
      completedFileCount: 1,
    });
    await renderEmptyDetail();

    await triggerUpload(
      new File(["x"], "study-guide.pdf", { type: "application/pdf" }),
    );

    expect(container.textContent).toContain("study-guide.pdf");
    expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
  });

  it("shows an error toast and keeps partial uploads on failure", async () => {
    const partial = createAssessmentAttachment();
    vi.mocked(uploadAssessmentFiles).mockResolvedValue({
      success: false,
      errorCode: "attachments.uploadFailed",
      errorParams: undefined,
      errorMessage: undefined,
      attachments: [partial],
      completedFileCount: 1,
    });
    await renderEmptyDetail();

    await triggerUpload(
      new File(["x"], "study-guide.pdf", { type: "application/pdf" }),
    );

    expect(container.textContent).toContain("study-guide.pdf");
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
      "Failed to upload attachment.",
    );
  });
});
