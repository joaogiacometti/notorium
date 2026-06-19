import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadAttachmentImage } from "./upload-attachment-image";

describe("uploadAttachmentImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the file and context as multipart form data and parses the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ success: true, url: "/u", pathname: "p" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["x"], "a.png", { type: "image/png" });
    const result = await uploadAttachmentImage(file, "flashcards");

    expect(result).toEqual({ success: true, url: "/u", pathname: "p" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/attachments/image",
      expect.objectContaining({ method: "POST" }),
    );
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("context")).toBe("flashcards");
    expect(body.get("file")).toBe(file);
  });

  it("returns an upload-failed result when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const result = await uploadAttachmentImage(
      new File(["x"], "a.png", { type: "image/png" }),
      "notes",
    );

    expect(result).toEqual({
      success: false,
      errorCode: "attachments.uploadFailed",
    });
  });
});
