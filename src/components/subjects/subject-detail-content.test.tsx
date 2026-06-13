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

vi.mock("@/components/documents/documents-list", () => ({
  DocumentsList: ({ subjectId }: { subjectId: string }) => (
    <section data-testid="documents-list">{subjectId}</section>
  ),
}));

function createSubject(overrides: Partial<SubjectEntity> = {}): SubjectEntity {
  return {
    id: "subject-1",
    userId: "user-1",
    name: "Biology",
    kind: "academic",
    totalClasses: 20,
    maxMisses: 5,
    archivedAt: null,
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

  it("renders the read-only subject sections", async () => {
    await act(async () => {
      root.render(
        <SubjectDetailContent
          subject={createSubject()}
          documents={[]}
          misses={[]}
          assessments={[createAssessment()]}
        />,
      );
    });

    expect(container.textContent).toContain("Assessment summary");
    expect(container.textContent).toContain("80.0");
    expect(
      container.querySelector('[data-testid="attendance-summary"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-testid="documents-list"]'),
    ).toBeTruthy();
  });

  it("can render without online assessment actions", async () => {
    await act(async () => {
      root.render(
        <SubjectDetailContent
          subject={createSubject()}
          documents={[]}
          misses={[]}
          assessments={[]}
          showAssessmentActions={false}
        />,
      );
    });

    expect(container.textContent).not.toContain("Manage assessments");
  });

  it("hides attendance and assessments for general subjects", async () => {
    await act(async () => {
      root.render(
        <SubjectDetailContent
          subject={createSubject({ kind: "general" })}
          documents={[]}
          misses={[]}
          assessments={[createAssessment()]}
        />,
      );
    });

    expect(container.textContent).not.toContain("Assessment summary");
    expect(
      container.querySelector('[data-testid="attendance-summary"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="documents-list"]'),
    ).toBeTruthy();
  });
});
