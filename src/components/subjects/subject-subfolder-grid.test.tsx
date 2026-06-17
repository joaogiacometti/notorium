import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubjectSubfolderGrid } from "@/components/subjects/subject-subfolder-grid";
import type { SubjectTreeNode } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

function createNode(overrides: Partial<SubjectTreeNode> = {}): SubjectTreeNode {
  return {
    id: "child-1",
    userId: "user-1",
    name: "Algebra",
    kind: "general",
    totalClasses: null,
    parentSubjectId: "subject-1",
    maxMisses: null,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
    documentCount: 0,
    children: [],
    path: "Math::Algebra",
    ...overrides,
  };
}

describe("SubjectSubfolderGrid", () => {
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
    vi.clearAllMocks();
  });

  it("links each subfolder to its subject page", async () => {
    await act(async () => {
      root.render(
        <SubjectSubfolderGrid
          childSubjects={[createNode(), createNode({ id: "child-2" })]}
        />,
      );
    });

    const links = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(links).toContain("/subjects/child-1");
    expect(links).toContain("/subjects/child-2");
  });

  it("renders rolled-up document and subfolder counts", async () => {
    await act(async () => {
      root.render(
        <SubjectSubfolderGrid
          childSubjects={[
            createNode({
              documentCount: 3,
              children: [createNode({ id: "grandchild-1" })],
            }),
          ]}
        />,
      );
    });

    expect(container.textContent).toContain("3 documents · 1 subfolder");
  });

  it("shows an empty label when a subfolder holds nothing", async () => {
    await act(async () => {
      root.render(<SubjectSubfolderGrid childSubjects={[createNode()]} />);
    });

    expect(container.textContent).toContain("Empty");
  });
});
