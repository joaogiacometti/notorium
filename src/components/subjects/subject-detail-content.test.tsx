import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubjectDetailContent } from "@/components/subjects/subject-detail-content";
import type {
  AssessmentEntity,
  SubjectEntity,
} from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/attendance/attendance-summary", () => ({
  AttendanceSummary: ({ subjectId }: { subjectId: string }) => (
    <section data-testid="attendance-summary">{subjectId}</section>
  ),
}));

vi.mock("@/components/subjects/subject-assessments-summary", () => ({
  SubjectAssessmentsSummary: ({ subjectId }: { subjectId: string }) => (
    <section data-testid="assessments-summary">{subjectId}</section>
  ),
}));

function createSubject(overrides: Partial<SubjectEntity> = {}): SubjectEntity {
  return {
    id: "subject-1",
    userId: "user-1",
    name: "Biology",
    kind: "academic",
    totalClasses: 20,
    parentSubjectId: null,
    maxMisses: 5,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
    ...overrides,
  };
}

function createAssessment(): AssessmentEntity {
  return {
    id: "assessment-1",
    userId: "user-1",
    subjectId: "subject-1",
    title: "Midterm",
    type: "exam",
    status: "completed",
    score: "80.00",
    weight: "50.00",
    dueDate: "2026-05-10",
    description: null,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  };
}

describe("SubjectDetailContent", () => {
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

  it("renders attendance and assessment dashboards for academic subjects", async () => {
    await act(async () => {
      root.render(
        <SubjectDetailContent
          subject={createSubject()}
          misses={[]}
          assessments={[createAssessment()]}
        />,
      );
    });

    expect(
      container.querySelector('[data-testid="attendance-summary"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="assessments-summary"]'),
    ).toBeTruthy();
  });

  it("shows a sidebar pointer for general subjects without dashboards", async () => {
    await act(async () => {
      root.render(
        <SubjectDetailContent
          subject={createSubject({ kind: "general" })}
          misses={[]}
          assessments={[]}
        />,
      );
    });

    expect(container.textContent).toContain("Managed in the sidebar");
    expect(
      container.querySelector('[data-testid="attendance-summary"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="assessments-summary"]'),
    ).toBeNull();
  });
});
