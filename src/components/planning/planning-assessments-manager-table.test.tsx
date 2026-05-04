import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningAssessmentsManagerTable } from "@/components/planning/planning-assessments-manager-table";
import type { AssessmentEntity } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/assessments/assessments-table-row-actions", () => ({
  AssessmentsTableRowActions: () => null,
}));

function createAssessment(
  overrides: Partial<AssessmentEntity> = {},
): AssessmentEntity {
  return {
    id: "assessment-1",
    title: "Midterm",
    description: "Chapters 1-4",
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

describe("PlanningAssessmentsManagerTable", () => {
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
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("renders a concrete assessment detail link from the title cell", async () => {
    await act(async () => {
      root.render(
        <PlanningAssessmentsManagerTable
          assessments={[createAssessment()]}
          finalGrade={null}
          total={1}
          isLoading={false}
          pageIndex={0}
          pageSize={25}
          selectedAssessmentIds={[]}
          selectedSubjectId="subject-1"
          subjectNamesById={{ "subject-1": "Biology" }}
          onPageIndexChange={() => {}}
          onPageSizeChange={() => {}}
          onSelectedAssessmentIdsChange={() => {}}
          onUpdated={() => {}}
          onDeleted={() => {}}
        />,
      );
    });

    const detailLink = container.querySelector<HTMLAnchorElement>(
      'a[aria-label="Open details for Midterm"]',
    );
    const rowLink = container.querySelector<HTMLElement>(
      '[role="link"][aria-label*="Midterm"]',
    );
    const row = container.querySelector<HTMLTableRowElement>("tbody tr");

    expect(detailLink?.getAttribute("href")).toBe(
      "/assessments/assessment-1?from=planning-assessments&subjectId=subject-1",
    );
    expect(rowLink).toBeNull();

    await act(async () => {
      row?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pushMock).toHaveBeenCalledWith(
      "/assessments/assessment-1?from=planning-assessments&subjectId=subject-1",
    );
  });
});
