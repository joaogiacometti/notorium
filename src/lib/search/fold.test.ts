import { describe, expect, it } from "vitest";
import { foldSearchText, includesFoldedText } from "@/lib/search/fold";

describe("foldSearchText", () => {
  it("lowercases and strips accents", () => {
    expect(foldSearchText("Função ÇÃO Ñandú")).toBe("funcao cao nandu");
  });

  it("keeps the original length so match indexes map back", () => {
    for (const value of ["Straße", "İstanbul", "éclair", "😀 émoji"]) {
      expect(foldSearchText(value)).toHaveLength(value.length);
    }
  });
});

describe("includesFoldedText", () => {
  it("matches across accents in either direction", () => {
    expect(includesFoldedText("Revolução Francesa", "revolucao")).toBe(true);
    expect(includesFoldedText("revolucao francesa", "Revolução")).toBe(true);
  });

  it("rejects text without the query", () => {
    expect(includesFoldedText("Mitose", "meiose")).toBe(false);
  });
});
