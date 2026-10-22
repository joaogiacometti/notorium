import { describe, expect, it } from "vitest";
import { describeHue } from "@/lib/mindmap/node-color-palette";

describe("describeHue", () => {
  it.each([
    [[230, 30, 30], "red"],
    [[250, 128, 25], "orange"],
    [[230, 210, 40], "yellow"],
    [[40, 180, 80], "green"],
    [[40, 170, 180], "teal"],
    [[40, 90, 220], "blue"],
    [[140, 60, 220], "purple"],
    [[211, 134, 155], "pink"],
    [[120, 120, 125], "gray"],
  ] as const)("names %j as %s", ([red, green, blue], name) => {
    expect(describeHue(red, green, blue)).toBe(name);
  });
});
