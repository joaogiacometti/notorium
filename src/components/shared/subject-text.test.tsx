import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SubjectText } from "@/components/shared/subject-text";

const SOFT_HYPHEN = "\u00ad";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe("SubjectText", () => {
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

  it("uses wrap-safe classes for long subject names", async () => {
    await act(async () => {
      root.render(<SubjectText value={"a".repeat(80)} mode="wrap" />);
    });

    const subjectName = container.querySelector("span");

    expect(subjectName?.className).toContain("min-w-0");
    expect(subjectName?.className).toContain("max-w-full");
    expect(subjectName?.className).toContain("whitespace-normal");
    expect(subjectName?.className).toContain("wrap-break-word");
    expect(subjectName?.className).toContain("hyphens-manual");
    expect(subjectName?.className).not.toContain("break-all");
    expect(subjectName?.textContent).toContain(SOFT_HYPHEN);
    expect(subjectName?.textContent?.replaceAll(SOFT_HYPHEN, "")).toBe(
      "a".repeat(80),
    );
    expect(subjectName?.title).toBe("");
  });

  it("keeps truncate behavior and tooltip defaults", async () => {
    const subjectName = "Organic Chemistry";

    await act(async () => {
      root.render(<SubjectText value={subjectName} mode="truncate" />);
    });

    const renderedSubjectName = container.querySelector("span");

    expect(renderedSubjectName?.className).toContain("min-w-0");
    expect(renderedSubjectName?.className).toContain("truncate");
    expect(renderedSubjectName?.title).toBe(subjectName);
  });
});
