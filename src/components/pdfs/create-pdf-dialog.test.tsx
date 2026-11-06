import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreatePdfDialog } from "@/components/pdfs/create-pdf-dialog";
import type { CreatePdfResult } from "@/features/pdfs/types";
import type { UploadPdfDocumentInput } from "@/lib/attachments/upload-pdf-document";
import type { FolderOption } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

class FakePdfUploader {
  readonly uploads: UploadPdfDocumentInput[] = [];

  upload = async (input: UploadPdfDocumentInput): Promise<CreatePdfResult> => {
    this.uploads.push(input);
    return { success: true, folderId: input.folderId, pdfId: "pdf-1" };
  };
}

let uploader = new FakePdfUploader();

vi.mock("@/lib/attachments/upload-pdf-document", () => ({
  uploadPdfDocument: (input: UploadPdfDocumentInput) => uploader.upload(input),
}));

vi.mock("@/app/actions/folders", () => ({
  createFolder: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

const folders: FolderOption[] = [
  {
    id: "folder-1",
    userId: "user-1",
    parentFolderId: null,
    name: "Biology",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    path: "Biology",
  },
];

describe("CreatePdfDialog with a folder picker", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    uploader = new FakePdfUploader();
    queryClient = new QueryClient();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function renderDialog(
    folderId: string | undefined,
    onSuccess: (pdfId: string, folderId: string) => void = vi.fn(),
  ) {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CreatePdfDialog
            folderId={folderId}
            folders={folders}
            open
            onOpenChange={vi.fn()}
            onSuccess={onSuccess}
          />
        </QueryClientProvider>,
      );
    });
  }

  async function pickFileAndSubmit() {
    const input = document.querySelector<HTMLInputElement>(
      "#form-create-pdf-file",
    );
    const form = document.querySelector<HTMLFormElement>("#form-create-pdf");
    if (!input || !form) {
      throw new Error("Expected the file input and form to render");
    }
    const file = new File(["%PDF-1.7"], "Cell Biology.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(input, "files", { value: [file] });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      form.requestSubmit();
    });
  }

  it("uploads to the preselected folder and reports it on success", async () => {
    const onSuccess = vi.fn();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await renderDialog("folder-1", onSuccess);
    await pickFileAndSubmit();

    expect(uploader.uploads).toHaveLength(1);
    expect(uploader.uploads[0]).toMatchObject({
      folderId: "folder-1",
      title: "Cell Biology",
    });
    expect(onSuccess).toHaveBeenCalledWith("pdf-1", "folder-1");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["search-data"] });
  });

  it("does not upload until a folder is chosen", async () => {
    await renderDialog(undefined);
    await pickFileAndSubmit();

    expect(uploader.uploads).toEqual([]);
  });
});
