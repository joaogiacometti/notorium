import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MindmapNodeToolbar } from "@/components/mindmaps/mindmap-node-toolbar";

const actions = vi.hoisted(() => ({
  toggleNodeStyle: vi.fn(),
  setNodeColor: vi.fn(),
  deleteNode: vi.fn(),
  splitIntoMindmap: vi.fn().mockResolvedValue(undefined),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@xyflow/react", () => ({
  NodeToolbar: ({ children }: { children: ReactNode }) => children,
  Position: { Top: "top" },
}));
vi.mock("@/components/mindmaps/mindmap-actions-context", () => ({
  useMindmapActions: () => actions,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
});

it("keeps branch editing, images, splitting and deletion without generation", async () => {
  const onImageClick = vi.fn();
  act(() =>
    root.render(
      <MindmapNodeToolbar
        nodeId="branch-1"
        data={{ label: "Cells" }}
        isVisible
        isMultiSelect={false}
        uploading={false}
        onImageClick={onImageClick}
      />,
    ),
  );
  const buttons = Array.from(container.querySelectorAll("button"));
  const labels = buttons.map((button) => button.getAttribute("aria-label"));
  expect(labels).not.toContain("Generate flashcards from branch");
  expect(labels).toEqual(
    expect.arrayContaining([
      "Bold",
      "Italic",
      "Default color",
      "Add image",
      "Break into new mindmap",
      "Delete node",
    ]),
  );
  for (const label of [
    "Bold",
    "Add image",
    "Break into new mindmap",
    "Delete node",
  ]) {
    await act(async () =>
      buttons
        .find((button) => button.getAttribute("aria-label") === label)
        ?.click(),
    );
  }
  expect(actions.toggleNodeStyle).toHaveBeenCalledWith("branch-1", "bold");
  expect(onImageClick).toHaveBeenCalledOnce();
  expect(actions.splitIntoMindmap).toHaveBeenCalledWith("branch-1");
  expect(actions.deleteNode).toHaveBeenCalledWith("branch-1");
});
