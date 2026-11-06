import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FolderSelect } from "@/components/shared/folder-select";
import type { FolderOption } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function getFolderOption(name: string, path = name): FolderOption {
  const now = new Date();
  return {
    id: path.toLowerCase(),
    name,
    path,
    parentFolderId: null,
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

describe("FolderSelect", () => {
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

  it("shows existing path patterns while typing a :: folder path", async () => {
    await act(async () => {
      root.render(
        <FolderSelect
          value={null}
          onChange={() => {}}
          folders={[
            getFolderOption("something"),
            getFolderOption("math", "something2::otherthing::math"),
          ]}
          onCreateFolder={vi.fn().mockResolvedValue(true)}
        />,
      );
    });

    const folderSelect = container.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      folderSelect.click();
    });

    const searchInput = document.body.querySelector(
      'input[placeholder="Search folders by path"]',
    ) as HTMLInputElement;
    await act(async () => {
      setInputValue(searchInput, "something::");
    });

    expect(document.body.textContent).toContain("something2::otherthing::math");
    expect(document.body.textContent).toContain("Create something::");
  });
});
