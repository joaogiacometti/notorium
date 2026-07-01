import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateGeneralSubjectPicker } from "@/components/shared/use-create-general-subject-picker";
import type { SubjectOption } from "@/lib/server/api-contracts";

const createSubjectMock = vi.fn();
const getSubjectOptionsMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/app/actions/subjects", () => ({
  createSubject: (...args: unknown[]) => createSubjectMock(...args),
  getSubjectOptions: (...args: unknown[]) => getSubjectOptionsMock(...args),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/lib/server/server-action-errors", () => ({
  t: (code: string) => code,
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

interface ProbeProps {
  initialSubjects?: SubjectOption[];
  loadSubjectsOnOpen?: boolean;
  queryClient: QueryClient;
}

function Probe({
  initialSubjects,
  loadSubjectsOnOpen,
  queryClient,
}: Readonly<ProbeProps>) {
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const { subjects, handleCreateSubject } = useCreateGeneralSubjectPicker({
    initialSubjects,
    open: true,
    loadSubjectsOnOpen,
    onSubjectCreated: setSelectedSubjectId,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <span data-testid="subjects">
        {subjects.map((s) => s.path).join(",")}
      </span>
      <span data-testid="selected">{selectedSubjectId}</span>
      <button
        type="button"
        onClick={() => {
          void handleCreateSubject("Biology");
        }}
      >
        Create
      </button>
    </QueryClientProvider>
  );
}

describe("useCreateGeneralSubjectPicker", () => {
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
    vi.clearAllMocks();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("loads, creates, refreshes, and selects a general subject", async () => {
    getSubjectOptionsMock
      .mockResolvedValueOnce([
        { id: "subject-1", name: "Math", path: "Math", kind: "general" },
      ])
      .mockResolvedValueOnce([
        { id: "subject-2", name: "Biology", path: "Biology", kind: "general" },
      ]);
    createSubjectMock.mockResolvedValue({
      success: true,
      subjectId: "subject-2",
    });
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Probe loadSubjectsOnOpen queryClient={queryClient} />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      container.querySelector('[data-testid="subjects"]')?.textContent,
    ).toBe("Math");

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(createSubjectMock).toHaveBeenCalledWith({
      name: "Biology",
      kind: "general",
    });
    expect(
      container.querySelector('[data-testid="subjects"]')?.textContent,
    ).toBe("Biology");
    expect(
      container.querySelector('[data-testid="selected"]')?.textContent,
    ).toBe("subject-2");
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["command-palette-subjects"],
    });
  });
});
