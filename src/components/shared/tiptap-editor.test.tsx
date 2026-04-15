import type { Editor } from "@tiptap/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleEditorPaste,
  isExternalEditorValueChange,
  shouldApplyNormalizedEditorValue,
  uploadPastedImage,
} from "@/components/shared/tiptap-editor";

const toastErrorMock = vi.fn();
const uploadEditorImageMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock("@/app/actions/attachments", () => ({
  uploadEditorImage: (...args: unknown[]) => uploadEditorImageMock(...args),
}));

function createFile(name: string, size: number, type = "image/png") {
  const content = "a".repeat(size);
  return new File([content], name, { type });
}

function createEditor(): Editor {
  return {
    chain: () => ({
      focus: () => ({
        setImage: ({ src }: { src: string }) => ({
          run: () => src,
        }),
      }),
    }),
  } as unknown as Editor;
}

function createClipboardEvent(file?: File) {
  return {
    clipboardData: {
      items: file
        ? [
            {
              kind: "file",
              getAsFile: () => file,
            },
          ]
        : [],
      getData: () => "",
    },
  } as unknown as ClipboardEvent;
}

describe("uploadPastedImage", () => {
  let readAsDataURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    toastErrorMock.mockReset();
    uploadEditorImageMock.mockReset();
    readAsDataURLMock = vi.fn(function readAsDataURL(
      this: FileReader,
      file: Blob,
    ) {
      queueMicrotask(() => {
        Object.defineProperty(this, "result", {
          configurable: true,
          value: `data:image/png;base64,${Buffer.from("uploaded").toString("base64")}`,
        });
        this.onload?.(
          new ProgressEvent("load", {
            lengthComputable: true,
            loaded: file.size,
          }) as ProgressEvent<FileReader>,
        );
      });
    });

    Object.defineProperty(FileReader.prototype, "readAsDataURL", {
      configurable: true,
      writable: true,
      value: readAsDataURLMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tracks pending state through a successful upload", async () => {
    const tracker = {
      start: vi.fn(),
      finish: vi.fn(),
    };

    uploadEditorImageMock.mockResolvedValue({
      success: true,
      url: "/api/attachments/blob?pathname=image.png",
    });

    await uploadPastedImage(
      createEditor(),
      createFile("example.png", 12),
      "notes",
      tracker,
    );

    expect(tracker.start).toHaveBeenCalledTimes(1);
    expect(uploadEditorImageMock).toHaveBeenCalledTimes(1);
    expect(tracker.finish).toHaveBeenCalledTimes(1);
  });

  it("clears pending state when reading the file fails", async () => {
    Object.defineProperty(FileReader.prototype, "readAsDataURL", {
      configurable: true,
      writable: true,
      value: function readAsDataURL(this: FileReader) {
        queueMicrotask(() => {
          this.onerror?.(
            new ProgressEvent("error") as ProgressEvent<FileReader>,
          );
        });
      },
    });

    const tracker = {
      start: vi.fn(),
      finish: vi.fn(),
    };

    await uploadPastedImage(
      createEditor(),
      createFile("broken.png", 12),
      "notes",
      tracker,
    );

    expect(uploadEditorImageMock).not.toHaveBeenCalled();
    expect(tracker.start).toHaveBeenCalledTimes(1);
    expect(tracker.finish).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
  });

  it("clears pending state after concurrent uploads finish", async () => {
    let resolveFirstUpload: ((value: unknown) => void) | undefined;
    let resolveSecondUpload: ((value: unknown) => void) | undefined;
    const events: string[] = [];
    const activeUploads = { current: 0 };
    const tracker = {
      start: () => {
        activeUploads.current += 1;
        events.push(`start:${activeUploads.current}`);
      },
      finish: () => {
        activeUploads.current -= 1;
        events.push(`finish:${activeUploads.current}`);
      },
    };

    uploadEditorImageMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstUpload = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondUpload = resolve;
          }),
      );

    const firstUpload = uploadPastedImage(
      createEditor(),
      createFile("first.png", 12),
      "notes",
      tracker,
    );
    const secondUpload = uploadPastedImage(
      createEditor(),
      createFile("second.png", 12),
      "notes",
      tracker,
    );

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(events).toEqual(["start:1", "start:2"]);

    resolveFirstUpload?.({
      success: true,
      url: "/api/attachments/blob?pathname=first.png",
    });
    await firstUpload;

    expect(activeUploads.current).toBe(1);
    expect(events).toContain("finish:1");

    resolveSecondUpload?.({
      success: true,
      url: "/api/attachments/blob?pathname=second.png",
    });
    await secondUpload;

    expect(activeUploads.current).toBe(0);
    expect(events.at(-1)).toBe("finish:0");
  });

  it("ignores a pasted image while another upload is already pending", () => {
    const tracker = {
      start: vi.fn(),
      finish: vi.fn(),
    };

    const handled = handleEditorPaste({
      editor: createEditor(),
      event: createClipboardEvent(createFile("second.png", 12)),
      imageUploadContext: "notes",
      isImageUploadPending: () => true,
      tracker,
    });

    expect(handled).toBe(true);
    expect(uploadEditorImageMock).not.toHaveBeenCalled();
    expect(tracker.start).not.toHaveBeenCalled();
    expect(tracker.finish).not.toHaveBeenCalled();
  });
});

describe("editor value synchronization", () => {
  it("treats editor-emitted updates as internal echoes", () => {
    expect(
      isExternalEditorValueChange(
        '<p>Legacy note<img src="/api/attachments/blob?pathname=image.png"></p>',
        '<p>Legacy note<img src="/api/attachments/blob?pathname=image.png"></p>',
      ),
    ).toBe(false);
  });

  it("treats differing incoming values as external changes", () => {
    expect(
      isExternalEditorValueChange("<p>Legacy note</p>", "<p>Edited note</p>"),
    ).toBe(true);
  });

  it("drops stale normalization results after the latest value changes", () => {
    expect(
      shouldApplyNormalizedEditorValue(
        "<p>Legacy note</p>",
        '<p>Legacy note</p><p><img src="/api/attachments/blob?pathname=image.png"></p>',
      ),
    ).toBe(false);
  });

  it("applies normalization results when the requested value is still current", () => {
    expect(
      shouldApplyNormalizedEditorValue(
        "<p>Legacy note</p>",
        "<p>Legacy note</p>",
      ),
    ).toBe(true);
  });
});
