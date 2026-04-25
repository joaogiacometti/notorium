import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  }),
}));

vi.mock("@/components/assessments/assessment-attachments-panel", () => ({
  AssessmentAttachmentsPanel: () => (
    <div data-testid="assessment-attachments-panel" />
  ),
}));

vi.mock("@/components/assessments/lazy-edit-assessment-dialog", () => ({
  LazyEditAssessmentDialog: () => null,
}));

vi.mock("@/components/assessments/delete-assessment-dialog", () => ({
  DeleteAssessmentDialog: () => null,
}));

function createAssessmentEntity(): AssessmentEntity {
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
          backHref="/planning"
          backLabel="Back to Planning"
          detail={createAssessmentDetail()}
        />,
      );
    });
  }

  it("renders attachment panel when attachments are enabled", async () => {
    await renderDetail(true);

    expect(
      container.querySelector('[data-testid="assessment-attachments-panel"]'),
    ).toBeTruthy();
  });

  it("hides attachment panel when attachments are disabled", async () => {
    await renderDetail(false);

    expect(
      container.querySelector('[data-testid="assessment-attachments-panel"]'),
    ).toBeNull();
  });
});
