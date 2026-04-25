import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanningAssessmentsTable } from "@/components/planning/planning-assessments-table";
import type {
  PlanningAssessmentsPage,
  SubjectEntity,
} from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const replaceMock = vi.fn();
const getPlanningAssessmentsPageMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => "/planning",
}));

vi.mock("@/app/actions/assessments", () => ({
  getPlanningAssessmentsPage: (...args: unknown[]) =>
    getPlanningAssessmentsPageMock(...args),
}));

vi.mock("@/components/assessments/lazy-create-assessment-dialog", () => ({
  LazyCreateAssessmentDialog: ({
    attachmentsEnabled,
    open,
  }: {
    attachmentsEnabled: boolean;
    open: boolean;
  }) =>
    open ? (
      <div
        data-attachments-enabled={String(attachmentsEnabled)}
        data-testid="create-assessment-dialog"
      />
    ) : null,
}));

vi.mock("@/components/planning/planning-assessments-manager-table", () => ({
  PlanningAssessmentsManagerTable: () => (
    <div data-testid="planning-assessments-manager-table" />
  ),
}));

const emptyPageData: PlanningAssessmentsPage = {
  items: [],
  total: 0,
  allCount: 0,
  subjectAssessmentCount: null,
  subjectFinalGrade: null,
};

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

describe("PlanningAssessmentsTable", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient();
    getPlanningAssessmentsPageMock.mockResolvedValue(emptyPageData);
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  async function renderTable(
    subjects: SubjectEntity[],
    attachmentsEnabled = true,
  ) {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <PlanningAssessmentsTable
            attachmentsEnabled={attachmentsEnabled}
            initialPageData={emptyPageData}
            subjects={subjects}
            subjectNamesById={Object.fromEntries(
              subjects.map((subject) => [subject.id, subject.name]),
            )}
          />
        </QueryClientProvider>,
      );
    });
  }

  it("disables both add actions and shows a tooltip when no subjects exist", async () => {
    await renderTable([]);

    const addButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.includes("Add Assessment"),
    ) as HTMLButtonElement[];
    const toolbarTrigger = container.querySelector<HTMLElement>(
      '[data-testid="planning-add-assessment-disabled-trigger"]',
    );
    const emptyStateTrigger = container.querySelector<HTMLElement>(
      '[data-testid="planning-empty-add-assessment-disabled-trigger"]',
    );

    expect(addButtons).toHaveLength(2);
    expect(addButtons.every((button) => button.disabled)).toBe(true);
    expect(toolbarTrigger).toBeTruthy();
    expect(emptyStateTrigger).toBeTruthy();

    await act(async () => {
      toolbarTrigger?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain(
      "Create a subject first to add assessments.",
    );

    await act(async () => {
      emptyStateTrigger?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain(
      "Create a subject first to add assessments.",
    );

    await act(async () => {
      addButtons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector('[data-testid="create-assessment-dialog"]'),
    ).toBeNull();
  });

  it("keeps add actions enabled when subjects exist", async () => {
    await renderTable([createSubject()]);

    const addButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.includes("Add Assessment"),
    ) as HTMLButtonElement[];

    expect(addButtons).toHaveLength(2);
    expect(addButtons.every((button) => !button.disabled)).toBe(true);

    await act(async () => {
      addButtons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector('[data-testid="create-assessment-dialog"]'),
    ).toBeTruthy();
  });

  it("passes attachment availability into the create dialog", async () => {
    await renderTable([createSubject()], false);

    const addButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.includes("Add Assessment"),
    ) as HTMLButtonElement[];

    await act(async () => {
      addButtons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container
        .querySelector('[data-testid="create-assessment-dialog"]')
        ?.getAttribute("data-attachments-enabled"),
    ).toBe("false");
  });
});
