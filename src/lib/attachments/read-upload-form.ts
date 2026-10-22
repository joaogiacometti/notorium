import { LIMITS } from "@/lib/config/limits";

export class UploadBodyTooLargeError extends Error {}

/** Parse multipart uploads only after enforcing a byte cap, including chunked bodies.
 * @example const form = await readUploadForm(request);
 */
export async function readUploadForm(request: Request): Promise<FormData> {
  const maximum = LIMITS.attachmentRequestMaxBytes;
  if (Number(request.headers.get("content-length")) > maximum) {
    await request.body?.cancel();
    throw new UploadBodyTooLargeError();
  }
  const bytes = await readBoundedUploadBytes(request, maximum);
  return new Response(bytes, { headers: request.headers }).formData();
}

async function readBoundedUploadBytes(
  request: Request,
  maximum: number,
): Promise<Blob> {
  const reader = request.body?.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  if (!reader) return new Blob();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return new Blob(chunks);
      size += value.byteLength;
      await enforceUploadByteLimit(reader, size, maximum);
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
}

async function enforceUploadByteLimit(
  reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>,
  size: number,
  maximum: number,
): Promise<void> {
  if (size <= maximum) return;
  await reader.cancel();
  throw new UploadBodyTooLargeError();
}
