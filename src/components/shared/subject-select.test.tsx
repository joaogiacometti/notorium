import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubjectSelect } from "@/components/shared/subject-select";
import type { SubjectOption } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function getSubjectOption(name: string, path = name): SubjectOption {
  const now = new Date();
  return {
    id: path.toLowerCase(),
    name,
    path,
    kind: "academic",
    parentSubjectId: null,
    totalClasses: null,
    maxMisses: null,
    userId: "user-1",
    createdAt: now,
    updatedAt: now,
  };
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("SubjectSelect", () => {
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
    document.body.replaceChildren();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("shows existing path patterns while typing a :: subject path", async () => {
    await act(async () => {
      root.render(
        <SubjectSelect
          value={null}
          onChange={() => {}}
          subjects={[
            getSubjectOption("something"),
            getSubjectOption("math", "something2::otherthing::math"),
          ]}
          onCreateSubject={vi.fn().mockResolvedValue(true)}
        />,
      );
    });

    const subjectSelect = container.querySelector(
      "button",
    ) as HTMLButtonElement;
    await act(async () => {
      subjectSelect.click();
    });

    const searchInput = document.body.querySelector(
      'input[placeholder="Search subjects by path"]',
    ) as HTMLInputElement;
    await act(async () => {
      setInputValue(searchInput, "something::");
    });

    expect(document.body.textContent).toContain("something2::otherthing::math");
    expect(document.body.textContent).toContain("Create something::");
  });
});
