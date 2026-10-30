import path from "node:path";
import type { Page, Request, Route } from "@playwright/test";
import { writeFixtureBlob } from "@/lib/media-storage/fixture-blob-store";

const fixtureRootDir = path.resolve(
  process.env.NOTORIUM_MEDIA_STORAGE_FIXTURE_DIR ??
    "test-results/media-storage-fixture",
);

// The browser uploads cross-origin, so the fake must answer CORS like the real API.
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "PUT, OPTIONS",
  "access-control-allow-headers": "*",
};

function isVercelBlobApiUrl(url: URL): boolean {
  return url.hostname === "vercel.com" && url.pathname.startsWith("/api/blob");
}

/**
 * Stands in for Vercel Blob's upload API: browser `put` calls land in the
 * folder the app's fixture media storage reads from.
 *
 * Chromium does not expose `File` request bodies to route handlers, so the
 * fixture stores the bytes the test uploads once the request's announced
 * length matches them.
 *
 * @example await new MediaStorageUploadFixture(pdfBytes).install(page);
 */
export class MediaStorageUploadFixture {
  constructor(private readonly uploadedBytes: Buffer) {}

  async install(page: Page): Promise<void> {
    await page.route(isVercelBlobApiUrl, (route) => this.respond(route));
  }

  private async respond(route: Route): Promise<void> {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }

    const pathname = await this.storeUpload(request);
    await route.fulfill({
      status: 200,
      headers: CORS_HEADERS,
      contentType: "application/json",
      json: {
        url: `fixture://${pathname}`,
        downloadUrl: `fixture://${pathname}?download=1`,
        pathname,
        contentType: request.headers()["x-content-type"],
        contentDisposition: "inline",
        etag: `"${pathname}"`,
      },
    });
  }

  private async storeUpload(request: Request): Promise<string> {
    const pathname = new URL(request.url()).searchParams.get("pathname");
    if (!pathname || request.method() !== "PUT") {
      throw new Error(
        `expected a PUT upload with a pathname, got ${request.method()} ${request.url()}`,
      );
    }
    const announcedLength = request.headers()["x-content-length"];
    if (announcedLength !== String(this.uploadedBytes.length)) {
      throw new Error(
        `expected an upload of ${this.uploadedBytes.length} bytes, got x-content-length "${announcedLength}"`,
      );
    }
    await writeFixtureBlob(
      fixtureRootDir,
      pathname,
      this.uploadedBytes,
      request.headers()["x-content-type"] ?? "application/octet-stream",
    );
    return pathname;
  }
}
