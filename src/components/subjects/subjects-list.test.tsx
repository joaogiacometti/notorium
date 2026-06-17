import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cloneElement, isValidElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubjectsList } from "@/components/subjects/subjects-list";
import { SubjectsTableSkeleton } from "@/components/subjects/subjects-table-skeleton";
import { LIMITS } from "@/lib/config/limits";
import type { SubjectListItem } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();
const getAllSubjectsMock = vi.fn();

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
  bulkDeleteSubjects: vi.fn(),
  getAllSubjects: (...args: unknown[]) => getAllSubjectsMock(...args),
  getSubjectListItems: (...args: unknown[]) => getAllSubjectsMock(...args),
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
  overrides: Partial<SubjectListItem> = {},
): SubjectListItem {
  return {
    id,
    userId: "user-1",
    name: `Subject ${id}`,
    kind: "academic",
    notesCount: 0,
    parentSubjectId: null,
    totalClasses: null,
    maxMisses: null,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-21T10:00:00.000Z"),
    ...overrides,
  };
}

function findButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  );
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
  subjects: SubjectListItem[],
) {
  root.render(
    <QueryClientProvider client={queryClient}>
      <SubjectsList subjects={subjects} />
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
    expect(container.textContent).toContain("0 notes");
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

  it("labels both academic and general subjects with a kind badge", async () => {
    const academic = createSubject("1", { name: "Calculus", kind: "academic" });
    const general = createSubject("2", { name: "Recipes", kind: "general" });

    await act(async () => {
      renderSubjectsList(root, queryClient, [academic, general]);
    });

    expect(container.textContent).toContain("Academic");
    expect(container.textContent).toContain("General");
  });

  it("filters subjects by name", async () => {
    const algebra = createSubject("1", { name: "Algebra" });
    const biology = createSubject("2", { name: "Cell Biology" });

    await act(async () => {
      renderSubjectsList(root, queryClient, [algebra, biology]);
    });

    const input = container.querySelector("input");

    await act(async () => {
      if (input) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;

        valueSetter?.call(input, "cell");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    expect(container.textContent).not.toContain("Algebra");
    expect(container.textContent).toContain("Cell Biology");
  });

  it("sorts subjects by name", async () => {
    const zebra = createSubject("1", { name: "Zebra Studies" });
    const algebra = createSubject("2", { name: "Algebra" });

    await act(async () => {
      renderSubjectsList(root, queryClient, [zebra, algebra]);
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

  it("keeps long subject names in table text", async () => {
    const longName = "Advanced Interdisciplinary Biology Research";

    await act(async () => {
      renderSubjectsList(root, queryClient, [
        createSubject("1", { name: longName }),
      ]);
    });

    const subjectLink = container.querySelector<HTMLAnchorElement>(
      `a[aria-label="Open ${longName}"]`,
    );

    expect(subjectLink?.textContent).toContain(longName);
    expect(subjectLink?.querySelector("span")?.className).toContain("truncate");
    expect(subjectLink?.querySelector("span")?.title).toBe(longName);
  });

  it("changes visible rows when the page size changes", async () => {
    await act(async () => {
      renderSubjectsList(
        root,
        queryClient,
        Array.from({ length: 12 }, (_, index) => createSubject(`${index + 1}`)),
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

  it("shows delete and clear actions for selected active rows", async () => {
    await act(async () => {
      renderSubjectsList(root, queryClient, [createSubject("1")]);
    });

    await act(async () => {
      selectSubjectAt(container, 0);
    });

    expect(container.textContent).toContain("1 selected");
    expect(findButtonByLabel(container, "Delete")).toBeTruthy();
    expect(findButtonByLabel(container, "Clear selection")).toBeTruthy();
  });

  it("renders the subjects table loading footer skeleton", async () => {
    await act(async () => {
      root.render(<SubjectsTableSkeleton selectedRow />);
    });

    expect(container.querySelector(".border-t")).toBeTruthy();
    expect(container.querySelector(".sm\\:hidden .grid-cols-2")).toBeTruthy();
  });

  it("keeps page count and rows selection on one mobile footer line", async () => {
    await act(async () => {
      renderSubjectsList(root, queryClient, [createSubject("1")]);
    });

    const pageBadge = Array.from(
      container.querySelectorAll(".rounded-full"),
    ).find((element) => element.textContent?.includes("Page 1 of 1"));
    const controlsRow = pageBadge?.parentElement;

    expect(controlsRow?.className).toContain("justify-between");
    expect(controlsRow?.className).toContain("sm:justify-start");
    expect(controlsRow?.textContent).toContain("Rows");
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
