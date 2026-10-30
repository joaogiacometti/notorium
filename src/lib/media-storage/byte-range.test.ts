import { describe, expect, it } from "vitest";
import { parseByteRangeHeader } from "@/lib/media-storage/byte-range";

describe("parseByteRangeHeader", () => {
  it("keeps a bounded single range", () => {
    expect(parseByteRangeHeader("bytes=0-65535")).toBe("bytes=0-65535");
  });

  it("keeps an open-ended range", () => {
    expect(parseByteRangeHeader(" bytes=1024- ")).toBe("bytes=1024-");
  });

  it.each([
    null,
    "",
    "bytes=5-1",
    "bytes=-500",
    "bytes=0-1,4-9",
    "items=0-1",
    "bytes=abc-",
  ])("rejects %j", (value) => {
    expect(parseByteRangeHeader(value)).toBeNull();
  });
});
