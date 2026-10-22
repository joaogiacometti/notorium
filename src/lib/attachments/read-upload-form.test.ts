import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/config/limits";
import { readUploadForm, UploadBodyTooLargeError } from "./read-upload-form";

class FakeUploadBody {
  cancelled = false;
  stream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
      cancel: () => {
        this.cancelled = true;
      },
    });
  }
}

function streamedRequest(
  body: ReadableStream<Uint8Array>,
  length?: string,
): Request {
  return new Request("http://localhost/upload", {
    method: "POST",
    body,
    headers: length ? { "content-length": length } : {},
    duplex: "half",
  } as RequestInit);
}

describe("readUploadForm", () => {
  it("preserves a valid multipart upload", async () => {
    const form = new FormData();
    form.set("context", "notes");
    form.set("file", new File(["image"], "image.png"));
    const parsed = await readUploadForm(
      new Request("http://localhost/upload", { method: "POST", body: form }),
    );
    expect(parsed.get("context")).toBe("notes");
    expect(await (parsed.get("file") as File).text()).toBe("image");
  });

  it("cancels a declared oversized body before reading", async () => {
    const fake = new FakeUploadBody();
    await expect(
      readUploadForm(
        streamedRequest(
          fake.stream([new Uint8Array(1)]),
          String(LIMITS.attachmentRequestMaxBytes + 1),
        ),
      ),
    ).rejects.toBeInstanceOf(UploadBodyTooLargeError);
    expect(fake.cancelled).toBe(true);
  });

  it.each([undefined, "1"])(
    "caps streamed bodies with content-length %s",
    async (length) => {
      const fake = new FakeUploadBody();
      const chunks = [
        new Uint8Array(LIMITS.attachmentRequestMaxBytes),
        new Uint8Array(1),
        new Uint8Array(1),
      ];
      await expect(
        readUploadForm(streamedRequest(fake.stream(chunks), length)),
      ).rejects.toBeInstanceOf(UploadBodyTooLargeError);
      expect(fake.cancelled).toBe(true);
    },
  );

  it("rejects malformed multipart content", async () => {
    await expect(
      readUploadForm(
        new Request("http://localhost/upload", {
          method: "POST",
          body: "invalid",
        }),
      ),
    ).rejects.toThrow();
  });
});
