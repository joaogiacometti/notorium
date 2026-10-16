import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssessmentDetail } from "@/components/assessments/assessment-detail";
import type {
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

vi.mock("@/components/assessments/lazy-edit-assessment-dialog", () => ({
  LazyEditAssessmentDialog: () => null,
}));

vi.mock("@/components/assessments/delete-assessment-dialog", () => ({
  DeleteAssessmentDialog: () => null,
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

function createAssessmentDetail(): AssessmentDetailEntity {
  return {
    assessment: createAssessmentEntity(),
    subject: {
      id: "subject-1",
      name: "Math",
    },
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

  async function renderDetail(detail = createAssessmentDetail()) {
    await act(async () => {
      root.render(
        <AssessmentDetail
          breadcrumb={[
            { label: "Planning", href: "/planning" },
            { label: "Final exam" },
          ]}
          returnHref="/planning"
          detail={detail}
        />,
      );
    });
  }

  it("shows the assessment title", async () => {
    await renderDetail();

    expect(container.textContent).toContain("Midterm 1");
  });

  it("shows the subject name in the details card", async () => {
    await renderDetail();

    expect(container.textContent).toContain("Math");
  });

  it("shows the type label in the details card", async () => {
    await renderDetail();

    expect(container.textContent).toContain("Exam");
  });

  it("shows status pill", async () => {
    await renderDetail();

    expect(container.textContent).toContain("Pending");
  });

  it("shows description empty state when description is null", async () => {
    await renderDetail();

    expect(container.textContent).toContain("Add a description");
  });

  it("shows description text when description is present", async () => {
    const detail = createAssessmentDetail();
    detail.assessment.description = "Covers chapters 1 through 5.";

    await renderDetail(detail);

    expect(container.textContent).toContain("Covers chapters 1 through 5.");
  });

  it("shows no-score state when score is null", async () => {
    await renderDetail();

    expect(container.textContent).toContain("No score yet");
  });

  it("shows score readout when score is present", async () => {
    const detail = createAssessmentDetail();
    detail.assessment.score = "85";

    await renderDetail(detail);

    expect(container.textContent).toContain("85");
    expect(container.textContent).toContain("85%");
  });
});
