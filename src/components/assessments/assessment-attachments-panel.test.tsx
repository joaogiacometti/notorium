import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssessmentAttachmentsPanel } from "@/components/assessments/assessment-attachments-panel";
import type { AssessmentAttachmentEntity } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const refreshMock = vi.fn();
const toastErrorMock = vi.fn();
const uploadAssessmentFilesMock = vi.fn();
const deleteAssessmentFilesMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock("@/components/assessments/assessment-attachment-actions", () => ({
  uploadAssessmentFiles: (...args: unknown[]) =>
    uploadAssessmentFilesMock(...args),
  deleteAssessmentFiles: (...args: unknown[]) =>
    deleteAssessmentFilesMock(...args),
}));

function createAttachment(
  overrides: Partial<AssessmentAttachmentEntity> = {},
): AssessmentAttachmentEntity {
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
    ...overrides,
  };
}

describe("AssessmentAttachmentsPanel", () => {
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

  async function renderPanel(attachments: AssessmentAttachmentEntity[]) {
    const onAttachmentsChange = vi.fn();

    await act(async () => {
      root.render(
        <AssessmentAttachmentsPanel
          assessmentId="assessment-1"
          attachments={attachments}
          onAttachmentsChange={onAttachmentsChange}
        />,
      );
    });

    return onAttachmentsChange;
  }

  it("renders existing attachments with download links", async () => {
    await renderPanel([createAttachment()]);

    const link = container.querySelector<HTMLAnchorElement>(
      'a[href="/api/attachments/assessment?id=attachment-1"]',
    );

    expect(link).toBeTruthy();
    expect(link?.textContent).toContain("study-guide.pdf");
    expect(link?.textContent).toContain("2.0 KB");
    expect(link?.className).toContain("hover:underline");
    expect(link?.querySelectorAll("svg")).toHaveLength(0);
  });

  it("uploads files from the detail page and appends returned attachments", async () => {
    const newAttachment = createAttachment({
      id: "attachment-2",
      fileName: "formula-sheet.pdf",
    });
    uploadAssessmentFilesMock.mockResolvedValue({
      success: true,
      attachments: [newAttachment],
    });
    const onAttachmentsChange = await renderPanel([createAttachment()]);
    const input = container.querySelector<HTMLInputElement>(
      "#assessment-detail-attachments",
    );

    Object.defineProperty(input, "files", {
      value: [new File(["notes"], "formula-sheet.pdf")],
      configurable: true,
    });

    await act(async () => {
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(uploadAssessmentFilesMock).toHaveBeenCalledWith("assessment-1", [
      expect.objectContaining({ name: "formula-sheet.pdf" }),
    ]);
    expect(onAttachmentsChange).toHaveBeenCalledWith([
      createAttachment(),
      newAttachment,
    ]);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("keeps successful attachments visible when a later upload fails", async () => {
    const newAttachment = createAttachment({
      id: "attachment-2",
      fileName: "formula-sheet.pdf",
    });
    uploadAssessmentFilesMock.mockResolvedValue({
      success: false,
      errorCode: "attachments.uploadFailed",
      errorParams: undefined,
      errorMessage: undefined,
      attachments: [newAttachment],
      completedFileCount: 1,
    });
    const onAttachmentsChange = await renderPanel([createAttachment()]);
    const input = container.querySelector<HTMLInputElement>(
      "#assessment-detail-attachments",
    );

    Object.defineProperty(input, "files", {
      value: [
        new File(["notes"], "formula-sheet.pdf"),
        new File(["more"], "broken.pdf"),
      ],
      configurable: true,
    });

    await act(async () => {
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onAttachmentsChange).toHaveBeenCalledWith([
      createAttachment(),
      newAttachment,
    ]);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to upload attachment.");
  });

  it("requires confirmation before deleting an attachment", async () => {
    deleteAssessmentFilesMock.mockResolvedValue({ success: true });
    const onAttachmentsChange = await renderPanel([createAttachment()]);
    const deleteButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Delete study-guide.pdf"]',
    );

    await act(async () => {
      deleteButton?.click();
    });

    expect(deleteAssessmentFilesMock).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Delete Attachment");

    const confirmButton = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        'button[data-variant="destructive"]',
      ),
    ).find((button) => button.textContent?.includes("Delete"));

    await act(async () => {
      confirmButton?.click();
    });

    expect(deleteAssessmentFilesMock).toHaveBeenCalledWith(["attachment-1"]);
    expect(onAttachmentsChange).toHaveBeenCalledWith([]);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("keeps current attachments when deletion fails", async () => {
    deleteAssessmentFilesMock.mockResolvedValue({
      success: false,
      errorCode: "attachments.deleteFailed",
      errorParams: undefined,
      errorMessage: undefined,
    });
    const onAttachmentsChange = await renderPanel([createAttachment()]);
    const deleteButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Delete study-guide.pdf"]',
    );

    await act(async () => {
      deleteButton?.click();
    });

    const confirmButton = document.body.querySelector<HTMLButtonElement>(
      'button[data-variant="destructive"]',
    );

    await act(async () => {
      confirmButton?.click();
    });

    expect(toastErrorMock).toHaveBeenCalledWith("Failed to delete attachment.");
    expect(onAttachmentsChange).not.toHaveBeenCalled();
  });
});
