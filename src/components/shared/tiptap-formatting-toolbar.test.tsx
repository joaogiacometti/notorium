import type { Editor } from "@tiptap/react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TiptapFormattingToolbar } from "@/components/shared/tiptap-formatting-toolbar";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@tiptap/react", () => ({
  useEditorState: ({
    editor,
    selector,
  }: {
    editor: Editor;
    selector: (context: {
      editor: Editor;
      transactionNumber: number;
    }) => unknown;
  }) => selector({ editor, transactionNumber: 0 }),
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

function createEditor(activeFormat?: string) {
  const commands: string[] = [];
  let lastCommand = "";
  const chain = new Proxy(
    {},
    {
      get: (_, property) => {
        if (property === "run") {
          return () => {
            commands.push(lastCommand);
            return true;
          };
        }
        return () => {
          if (property !== "focus") lastCommand = String(property);
          return chain;
        };
      },
    },
  );
  const editor = {
    chain: () => chain,
    isActive: (format: string) => format === activeFormat,
  } as unknown as Editor;
  return { commands, editor };
}

describe("TiptapFormattingToolbar", () => {
  const onEditLink = vi.fn();
  const onSelectImage = vi.fn();
  const container = document.createElement("div");
  const root = createRoot(container);

  beforeEach(() => {
    document.body.appendChild(container);
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    await act(async () => root.render(null));
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("exposes formatting commands and reflects the active format", async () => {
    const { commands, editor } = createEditor("bold");

    await act(async () => {
      root.render(
        <TiptapFormattingToolbar
          editor={editor}
          imageUploadPending={false}
          onEditLink={onEditLink}
          onSelectImage={onSelectImage}
        />,
      );
    });

    expect(
      container.querySelector('[role="toolbar"]')?.getAttribute("aria-label"),
    ).toBe("Text formatting");
    expect(
      container
        .querySelector('button[aria-label="Bold"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      container.querySelector('button[aria-label="Task list"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('button[aria-label="Code block"]'),
    ).toBeTruthy();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Heading 2"]')
        ?.click();
    });
    expect(commands).toContain("toggleHeading");
  });

  it("opens image selection and disables it during an upload", async () => {
    const { editor } = createEditor();

    await act(async () => {
      root.render(
        <TiptapFormattingToolbar
          editor={editor}
          imageUploadPending={false}
          onEditLink={onEditLink}
          onSelectImage={onSelectImage}
        />,
      );
    });
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Image"]')
        ?.click();
    });
    expect(onSelectImage).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.render(
        <TiptapFormattingToolbar
          editor={editor}
          imageUploadPending
          onEditLink={onEditLink}
          onSelectImage={onSelectImage}
        />,
      );
    });
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Uploading image"]',
      )?.disabled,
    ).toBe(true);
  });
});
