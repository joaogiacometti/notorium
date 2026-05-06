import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArchivedSubjectCard } from "@/components/subjects/archived-subject-card";
import type { SubjectEntity } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const refreshMock = vi.fn();
const restoreSubjectMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/app/actions/subjects", () => ({
  restoreSubject: (...args: unknown[]) => restoreSubjectMock(...args),
}));

vi.mock("@/components/subjects/delete-subject-dialog", () => ({
  DeleteSubjectDialog: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

function createArchivedSubject(): SubjectEntity {
  return {
    id: "subject-1",
    userId: "user-1",
    name: "Archived Biology",
    totalClasses: null,
    maxMisses: null,
    archivedAt: new Date("2026-04-20T10:00:00.000Z"),
    createdAt: new Date("2026-04-18T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  };
}

function findButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  );
}

describe("ArchivedSubjectCard", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("removes the card and refreshes after a successful restore", async () => {
    restoreSubjectMock.mockResolvedValueOnce({ success: true });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ArchivedSubjectCard subject={createArchivedSubject()} />
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain("Archived Biology");

    await act(async () => {
      findButton(container, "Restore")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(restoreSubjectMock).toHaveBeenCalledWith({ id: "subject-1" });
    expect(container.textContent).not.toContain("Archived Biology");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
