import { act, cloneElement, isValidElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubjectsList } from "@/components/subjects/subjects-list";
import { LIMITS } from "@/lib/config/limits";
import type { SubjectEntity } from "@/lib/server/api-contracts";

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

vi.mock("@/app/actions/subjects", () => ({
  getSubjects: vi.fn(),
}));

vi.mock("@/components/subjects/subject-card", () => ({
  SubjectCard: ({ subject }: { subject: SubjectEntity }) => (
    <div>{subject.name}</div>
  ),
}));

vi.mock("@/components/subjects/edit-subject-dialog", () => ({
  EditSubjectDialog: () => null,
}));

vi.mock("@/components/subjects/delete-subject-dialog", () => ({
  DeleteSubjectDialog: () => null,
}));

vi.mock("@/components/subjects/create-subject-dialog", () => ({
  CreateSubjectDialog: ({
    trigger,
    open,
    onOpenChange,
  }: {
    trigger: React.ReactElement<Record<string, unknown>>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => {
    const child = trigger.props.children;
    const disabled =
      trigger.props.disabled ||
      (isValidElement(child) &&
        Boolean((child.props as { disabled?: boolean }).disabled));

    return (
      <>
        {cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, {
          onClick: () => {
            if (!disabled) {
              onOpenChange(true);
            }
          },
        })}
        {open ? <div data-testid="create-subject-dialog" /> : null}
      </>
    );
  },
}));

function createSubject(id: string): SubjectEntity {
  return {
    id,
    userId: "user-1",
    name: `Subject ${id}`,
    description: null,
    totalClasses: null,
    maxMisses: null,
    archivedAt: null,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  };
}

function findButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  ) as HTMLButtonElement | undefined;
}

describe("SubjectsList", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
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

  it("keeps the create action enabled below the limit", async () => {
    await act(async () => {
      root.render(
        <SubjectsList subjects={[createSubject("1")]} archivedCount={0} />,
      );
    });

    const button = findButton(container, "New Subject");

    expect(button?.disabled).toBe(false);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector('[data-testid="create-subject-dialog"]'),
    ).toBeTruthy();
  });

  it("shows a tooltip when the create action is disabled at the limit", async () => {
    await act(async () => {
      root.render(
        <SubjectsList
          subjects={Array.from({ length: LIMITS.maxSubjects }, (_, index) =>
            createSubject(`${index + 1}`),
          )}
          archivedCount={0}
        />,
      );
    });

    const button = findButton(container, "New Subject");
    const trigger = container.querySelector<HTMLElement>(
      '[data-testid="new-subject-disabled-trigger"]',
    );

    expect(button?.disabled).toBe(true);
    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger?.focus();
      vi.runAllTimers();
    });

    expect(document.body.textContent).toContain(
      "Archive or delete a subject to create another one.",
    );
  });
});
