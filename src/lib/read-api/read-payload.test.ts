import { describe, expect, it } from "vitest";
import {
  decodeReadPayload,
  encodeReadPayload,
} from "@/lib/read-api/read-payload";

describe("read payload codec", () => {
  it("round-trips nested Date values as Date instances", () => {
    const payload = {
      items: [{ id: "a", updatedAt: new Date("2026-10-15T12:00:00.000Z") }],
      dueAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const decoded = decodeReadPayload(encodeReadPayload(payload));

    expect(decoded).toEqual(payload);
    expect((decoded as typeof payload).dueAt).toBeInstanceOf(Date);
  });

  it("leaves ISO-looking strings as strings", () => {
    const payload = { title: "2026-10-15T12:00:00.000Z" };

    expect(decodeReadPayload(encodeReadPayload(payload))).toEqual(payload);
  });

  it("encodes an invalid Date as null instead of throwing", () => {
    expect(encodeReadPayload({ at: new Date("nope") })).toBe('{"at":null}');
  });

  it("only revives objects whose sole key is the date tag", () => {
    const text = '{"a":{"$date":"2026-01-01T00:00:00.000Z","x":1}}';

    expect(decodeReadPayload(text)).toEqual({
      a: { $date: "2026-01-01T00:00:00.000Z", x: 1 },
    });
  });

  it("supports a top-level Date and primitives", () => {
    const at = new Date("2026-01-01T00:00:00.000Z");

    expect(decodeReadPayload(encodeReadPayload(at))).toEqual(at);
    expect(decodeReadPayload(encodeReadPayload(null))).toBeNull();
    expect(decodeReadPayload(encodeReadPayload([1, "x"]))).toEqual([1, "x"]);
  });
});
