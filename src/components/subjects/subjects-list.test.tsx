import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cloneElement, isValidElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubjectsList } from "@/components/subjects/subjects-list";
import { SubjectsTableSkeleton } from "@/components/subjects/subjects-table-skeleton";
import { LIMITS } from "@/lib/config/limits";
import type { SubjectEntity } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();
const getAllSubjectsMock = vi.fn();
const restoreSubjectMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
  }),
}));

vi.mock("@/app/actions/subjects", () => ({
  bulkArchiveSubjects: vi.fn(),
  bulkDeleteSubjects: vi.fn(),
  bulkRestoreSubjects: vi.fn(),
  getAllSubjects: (...args: unknown[]) => getAllSubjectsMock(...args),
  restoreSubject: (...args: unknown[]) => restoreSubjectMock(...args),
}));

vi.mock("@/components/subjects/bulk-archive-subjects-dialog", () => ({
  BulkArchiveSubjectsDialog: ({
    ids,
    open,
    onArchived,
  }: {
    ids: string[];
    open: boolean;
    onArchived: (ids: string[]) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onArchived(ids)}>
        Confirm bulk archive
      </button>
    ) : null,
}));

vi.mock("@/components/subjects/bulk-delete-subjects-dialog", () => ({
  BulkDeleteSubjectsDialog: ({
    ids,
    open,
    onDeleted,
  }: {
    ids: string[];
    open: boolean;
    onDeleted: (ids: string[]) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onDeleted(ids)}>
        Confirm bulk delete
      </button>
    ) : null,
}));

vi.mock("@/components/subjects/bulk-restore-subjects-dialog", () => ({
  BulkRestoreSubjectsDialog: ({
    ids,
    open,
    onRestored,
  }: {
    ids: string[];
    open: boolean;
    onRestored: (ids: string[]) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onRestored(ids)}>
        Confirm bulk restore
      </button>
    ) : null,
}));

vi.mock("@/components/subjects/edit-subject-dialog", () => ({
  EditSubjectDialog: () => <div data-testid="edit-subject-dialog" />,
}));

vi.mock("@/components/subjects/delete-subject-dialog", () => ({
  DeleteSubjectDialog: ({ mode }: { mode?: string }) => (
    <div data-testid={`${mode ?? "delete"}-subject-dialog`} />
  ),
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
    const disabled = hasDisabledChild(trigger);

    const triggerElement =
      disabled || !isValidElement(trigger)
        ? trigger
        : cloneElement(trigger, {
            onClick: () => onOpenChange(true),
          });

    return (
      <>
        {triggerElement}
        {open ? <div data-testid="create-subject-dialog" /> : null}
      </>
    );
  },
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button className={className} type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactElement }) =>
    children,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <select
      value={value}
      onChange={(event) => onValueChange(event.currentTarget.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => children,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => children,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange: (value: string) => void;
  }) => (
    <div
      role="tablist"
      onClick={(event) => {
        const target = event.target as HTMLElement;
        const trigger = target.closest("[data-tab-value]");
        const value = trigger?.getAttribute("data-tab-value");

        if (value) onValueChange(value);
      }}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        const value = target.getAttribute("data-tab-value");

        if (event.key === "Enter" && value) onValueChange(value);
      }}
    >
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TabsTrigger: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <button type="button" data-tab-value={value}>
      {children}
    </button>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

function hasDisabledChild(node: React.ReactNode): boolean {
  if (!isValidElement(node)) return false;

  const props = node.props as {
    children?: React.ReactNode;
    disabled?: boolean;
  };

  return Boolean(props.disabled) || hasDisabledChild(props.children);
}

function createSubject(
  id: string,
  overrides: Partial<SubjectEntity> = {},
): SubjectEntity {
  return {
    id,
    userId: "user-1",
    name: `Subject ${id}`,
    description: null,
    totalClasses: null,
    maxMisses: null,
    archivedAt: null,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-21T10:00:00.000Z"),
    ...overrides,
  };
}

function findButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  ) as HTMLButtonElement | undefined;
}

function findButtonByLabel(container: HTMLElement, label: string) {
  return container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
}

function selectSubjectAt(container: HTMLElement, rowIndex: number) {
  const selectionCells = Array.from(
    container.querySelectorAll<HTMLElement>(
      'tbody td[data-no-row-click="true"]',
    ),
  );

  selectionCells[rowIndex]?.dispatchEvent(
    new MouseEvent("click", { bubbles: true }),
  );
}

function renderSubjectsList(
  root: Root,
  queryClient: QueryClient,
  subjects: SubjectEntity[],
  initialStatus: "active" | "archived" | "all" = "active",
) {
  root.render(
    <QueryClientProvider client={queryClient}>
      <SubjectsList initialStatus={initialStatus} subjects={subjects} />
    </QueryClientProvider>,
  );
}

describe("SubjectsList", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient();
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

  it("renders active rows in the table and opens create below the limit", async () => {
    await act(async () => {
      renderSubjectsList(root, queryClient, [createSubject("1")]);
    });

    expect(container.textContent).toContain("Subject 1");
    expect(container.textContent).toContain("Created");
    expect(container.textContent).toContain("Apr 20, 2026");
    expect(container.textContent).not.toContain("10:00 AM");
    expect(container.querySelector("table")).toBeTruthy();
    expect(
      Array.from(container.querySelectorAll("th")).some((header) =>
        header.textContent?.includes("Updated"),
      ),
    ).toBe(false);

    const button = findButton(container, "New Subject");
    expect(button?.disabled).toBe(false);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector('[data-testid="create-subject-dialog"]'),
    ).toBeTruthy();
  });

  it("shows archived subjects when the archived filter is selected", async () => {
    const active = createSubject("1", { name: "Active Biology" });
    const archived = createSubject("2", {
      name: "Archived History",
      archivedAt: new Date("2026-04-25T10:00:00.000Z"),
    });

    await act(async () => {
      renderSubjectsList(root, queryClient, [active, archived], "archived");
    });

    expect(container.textContent).not.toContain("Active Biology");
    expect(container.textContent).toContain("Archived History");
    expect(container.textContent).toContain("Restore");
    expect(container.textContent).not.toContain("Edit");
  });

  it("filters subjects by name and description", async () => {
    const algebra = createSubject("1", { name: "Algebra" });
    const biology = createSubject("2", { description: "Cells and genetics" });

    await act(async () => {
      renderSubjectsList(root, queryClient, [algebra, biology], "all");
    });

    const input = container.querySelector("input");

    await act(async () => {
      if (input) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;

        valueSetter?.call(input, "cells");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    expect(container.textContent).not.toContain("Algebra");
    expect(container.textContent).toContain("Cells and genetics");
  });

  it("sorts subjects by name", async () => {
    const zebra = createSubject("1", { name: "Zebra Studies" });
    const algebra = createSubject("2", { name: "Algebra" });

    await act(async () => {
      renderSubjectsList(root, queryClient, [zebra, algebra], "all");
    });

    const select = container.querySelector("select");

    await act(async () => {
      if (select) {
        select.value = "nameAsc";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    expect(container.textContent.indexOf("Algebra")).toBeLessThan(
      container.textContent.indexOf("Zebra Studies"),
    );
  });

  it("changes visible rows when the page size changes", async () => {
    await act(async () => {
      renderSubjectsList(
        root,
        queryClient,
        Array.from({ length: 12 }, (_, index) => createSubject(`${index + 1}`)),
        "all",
      );
    });

    expect(container.textContent).toContain("Subject 10");
    expect(container.textContent).not.toContain("Subject 11");

    const pageSizeSelect = Array.from(
      container.querySelectorAll("select"),
    ).find((select) => select.textContent?.includes("25"));

    await act(async () => {
      if (pageSizeSelect) {
        pageSizeSelect.value = "25";
        pageSizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    expect(container.textContent).toContain("Subject 11");
  });

  it("exposes selection checkboxes", async () => {
    await act(async () => {
      renderSubjectsList(root, queryClient, [createSubject("1")]);
    });

    expect(
      container.querySelectorAll(
        '[role="checkbox"][aria-label="Select subject"]',
      ).length,
    ).toBeGreaterThan(0);
  });

  it("shows archive, delete, and clear actions for selected active rows", async () => {
    await act(async () => {
      renderSubjectsList(root, queryClient, [createSubject("1")]);
    });

    await act(async () => {
      selectSubjectAt(container, 0);
    });

    expect(container.textContent).toContain("1 selected");
    expect(findButtonByLabel(container, "Archive")).toBeTruthy();
    expect(findButtonByLabel(container, "Delete")).toBeTruthy();
    expect(findButtonByLabel(container, "Clear selection")).toBeTruthy();
    expect(findButtonByLabel(container, "Restore")).toBeFalsy();
  });

  it("shows restore, delete, and clear actions for selected archived rows", async () => {
    const archived = createSubject("1", {
      archivedAt: new Date("2026-04-25T10:00:00.000Z"),
    });

    await act(async () => {
      renderSubjectsList(root, queryClient, [archived], "archived");
    });

    await act(async () => {
      selectSubjectAt(container, 0);
    });

    expect(findButtonByLabel(container, "Restore")).toBeTruthy();
    expect(findButtonByLabel(container, "Delete")).toBeTruthy();
    expect(findButtonByLabel(container, "Clear selection")).toBeTruthy();
    expect(findButtonByLabel(container, "Archive")).toBeFalsy();
  });

  it("refreshes subjects and clears selection after bulk success", async () => {
    getAllSubjectsMock.mockResolvedValueOnce([]);

    await act(async () => {
      renderSubjectsList(root, queryClient, [createSubject("1")]);
    });

    await act(async () => {
      selectSubjectAt(container, 0);
    });

    await act(async () => {
      findButtonByLabel(container, "Archive")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    await act(async () => {
      findButton(container, "Confirm bulk archive")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(getAllSubjectsMock).toHaveBeenCalled();
    expect(container.textContent).not.toContain("1 selected");
  });

  it("renders the subjects table loading footer skeleton", async () => {
    await act(async () => {
      root.render(<SubjectsTableSkeleton selectedRow />);
    });

    expect(container.querySelector(".border-t")).toBeTruthy();
  });

  it("shows a tooltip when the create action is disabled at the limit", async () => {
    await act(async () => {
      renderSubjectsList(
        root,
        queryClient,
        Array.from({ length: LIMITS.maxSubjects }, (_, index) =>
          createSubject(`${index + 1}`),
        ),
      );
    });

    const button = findButton(container, "New Subject");
    const trigger = container.querySelector<HTMLElement>(
      '[data-testid="new-subject-disabled-trigger"]',
    );

    expect(button?.disabled).toBe(true);
    expect(trigger).toBeTruthy();
  });
});
