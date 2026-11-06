import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FolderText } from "@/components/shared/folder-text";

const SOFT_HYPHEN = "\u00ad";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe("FolderText", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("uses wrap-safe classes for long folder names", async () => {
    await act(async () => {
      root.render(<FolderText value={"a".repeat(80)} mode="wrap" />);
    });

    const folderName = container.querySelector("span");

    expect(folderName?.className).toContain("min-w-0");
    expect(folderName?.className).toContain("max-w-full");
    expect(folderName?.className).toContain("whitespace-normal");
    expect(folderName?.className).toContain("wrap-break-word");
    expect(folderName?.className).toContain("hyphens-manual");
    expect(folderName?.className).not.toContain("break-all");
    expect(folderName?.textContent).toContain(SOFT_HYPHEN);
    expect(folderName?.textContent?.replaceAll(SOFT_HYPHEN, "")).toBe(
      "a".repeat(80),
    );
    expect(folderName?.title).toBe("");
  });

  it("keeps truncate behavior and tooltip defaults", async () => {
    const folderName = "Organic Chemistry";

    await act(async () => {
      root.render(<FolderText value={folderName} mode="truncate" />);
    });

    const renderedFolderName = container.querySelector("span");

    expect(renderedFolderName?.className).toContain("min-w-0");
    expect(renderedFolderName?.className).toContain("truncate");
    expect(renderedFolderName?.title).toBe(folderName);
  });
});
