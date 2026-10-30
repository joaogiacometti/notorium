import { describe, expect, it } from "vitest";
import {
  isByteRangeUnsatisfiable,
  parseByteRangeHeader,
  readByteRangeBounds,
} from "@/lib/media-storage/byte-range";

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

describe("isByteRangeUnsatisfiable", () => {
  it.each([
    ["bytes=1000-", 1000],
    ["bytes=1500-1600", 1000],
    ["bytes=0-", 0],
  ])("rejects %j for a %i byte blob", (range, size) => {
    expect(isByteRangeUnsatisfiable(range, size)).toBe(true);
  });

  it.each([
    ["bytes=999-", 1000],
    ["bytes=0-5000", 1000],
  ])("accepts %j for a %i byte blob", (range, size) => {
    expect(isByteRangeUnsatisfiable(range, size)).toBe(false);
  });
});

describe("readByteRangeBounds", () => {
  it("reads a bounded range", () => {
    expect(readByteRangeBounds("bytes=0-65535")).toEqual({
      start: 0,
      end: 65535,
    });
  });

  it("reads an open-ended range", () => {
    expect(readByteRangeBounds("bytes=1024-")).toEqual({
      start: 1024,
      end: null,
    });
  });
});
