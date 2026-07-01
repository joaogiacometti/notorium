import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/config/limits";

const uploadBookMock = vi.fn();
const generateLibraryUploadTokenMock = vi.fn();
const createSubjectMock = vi.fn();
const getSubjectOptionsMock = vi.fn();
const subjectSelectProps: Array<{
  disabled?: boolean;
  value: string | null;
  onChange: (value: string | null) => void;
  onCreateSubject?: (name: string) => Promise<boolean>;
}> = [];

vi.mock("server-only", () => ({}));

vi.mock("@/app/actions/library", () => ({
  uploadBook: (...args: unknown[]) => uploadBookMock(...args),
  generateLibraryUploadToken: (...args: unknown[]) =>
    generateLibraryUploadTokenMock(...args),
}));

vi.mock("@/app/actions/subjects", () => ({
  createSubject: (...args: unknown[]) => createSubjectMock(...args),
  getSubjectOptions: (...args: unknown[]) => getSubjectOptionsMock(...args),
}));

vi.mock("@/components/shared/subject-select", () => ({
  SubjectSelect: (props: {
    disabled?: boolean;
    value: string | null;
    onChange: (value: string | null) => void;
    onCreateSubject?: (name: string) => Promise<boolean>;
  }) => {
    subjectSelectProps.push(props);
    return (
      <button
        type="button"
        data-testid="create-subject"
        disabled={props.disabled}
        onClick={() => {
          void props.onCreateSubject?.("Biology");
        }}
      >
        Create Biology
      </button>
    );
  },
}));

vi.mock("@vercel/blob/client", () => ({
  put: vi.fn().mockResolvedValue({
    url: "https://blob/notorium/library/user-1/book.pdf",
    pathname: "notorium/library/user-1/book.pdf",
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/lib/server/server-action-errors", () => ({
  t: (code: string) => code,
}));

vi.mock("@/components/shared/async-button-content", () => ({
  AsyncButtonContent: ({ idleLabel }: { idleLabel: string }) => idleLabel,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makePdf(name: string, sizeBytes = 1024): File {
  const file = new File(["%PDF-1.4"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(
    "#form-add-book-file",
  );
  if (!input) {
    throw new Error("file input not found");
  }
  return input;
}

async function selectFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function getError(container: HTMLElement): string | undefined {
  return container.querySelector("#form-add-book-file")?.parentElement
    ?.textContent;
}

describe("AddBookDialog file validation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    queryClient = new QueryClient();
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
    subjectSelectProps.length = 0;
    vi.clearAllMocks();
  });

  async function render(
    props: Partial<
      React.ComponentProps<
        typeof import("@/components/library/add-book-dialog").AddBookDialog
      >
    > = {},
  ) {
    const { AddBookDialog } = await import(
      "@/components/library/add-book-dialog"
    );
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <AddBookDialog open onOpenChange={vi.fn()} {...props} />
        </QueryClientProvider>,
      );
    });
  }

  it("rejects a non-PDF file and does not autofill the title", async () => {
    await render();
    const input = getFileInput(container);
    const png = new File(["x"], "cover.png", { type: "image/png" });

    await selectFile(input, png);

    expect(getError(container)).toContain("Only PDF files are supported.");
  });

  it("rejects a PDF over the size limit", async () => {
    await render();
    const input = getFileInput(container);

    await selectFile(
      input,
      makePdf("huge.pdf", LIMITS.libraryBookMaxBytes + 1),
    );

    expect(getError(container)).toContain("File is too large");
  });

  it("accepts a valid PDF and autofills the title without the extension", async () => {
    await render();
    const input = getFileInput(container);

    await selectFile(input, makePdf("Clean Code.pdf"));

    expect(getError(container)).not.toContain("supported");
    expect(getError(container)).not.toContain("too large");
    const title = container.querySelector<HTMLInputElement>(
      "#form-add-book-title",
    );
    expect(title?.value).toBe("Clean Code");
  });

  it("uploads the book and closes the dialog on success", async () => {
    generateLibraryUploadTokenMock.mockResolvedValue({
      success: true,
      token: "token-123",
      pathname: "notorium/library/user-1/book.pdf",
    });
    uploadBookMock.mockResolvedValue({
      success: true,
      book: { id: "book-1", subjectId: "subject-1" },
    });
    const onOpenChange = vi.fn();
    await render({ onOpenChange, subjectId: "subject-1" });

    const input = getFileInput(container);
    await selectFile(input, makePdf("Clean Code.pdf"));

    const submitButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.type === "submit");
    await act(async () => {
      submitButton?.click();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(uploadBookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Clean Code",
        fileName: "Clean Code.pdf",
        mimeType: "application/pdf",
        subjectId: "subject-1",
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("creates and selects a subject from the picker", async () => {
    createSubjectMock.mockResolvedValue({
      success: true,
      subjectId: "subject-2",
    });
    getSubjectOptionsMock.mockResolvedValue([
      { id: "subject-2", name: "Biology", path: "Biology", kind: "general" },
    ]);
    await render();
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const button = container.querySelector<HTMLButtonElement>(
      '[data-testid="create-subject"]',
    );
    await act(async () => {
      button?.click();
    });

    expect(subjectSelectProps.at(-1)?.disabled).toBeUndefined();
    expect(createSubjectMock).toHaveBeenCalledWith({
      name: "Biology",
      kind: "general",
    });
    expect(getSubjectOptionsMock).toHaveBeenCalledOnce();
    expect(subjectSelectProps.at(-1)?.value).toBe("subject-2");
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["command-palette-subjects"],
    });
  });
});
