import type { Editor } from "@tiptap/react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EDITOR_ROOT_ATTRIBUTE,
  focusToolbarOnShortcut,
  TiptapFormattingToolbar,
} from "@/components/shared/tiptap-formatting-toolbar";

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

  async function renderToolbar(imageUploadPending = false) {
    const { editor } = createEditor();
    await act(async () => {
      root.render(
        <TiptapFormattingToolbar
          editor={editor}
          imageUploadPending={imageUploadPending}
          onEditLink={onEditLink}
          onSelectImage={onSelectImage}
        />,
      );
    });
  }

  function pressInToolbar(key: string) {
    const toolbar = container.querySelector('[role="toolbar"]');
    act(() => {
      toolbar?.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      );
    });
  }

  function focusedLabel() {
    return document.activeElement?.getAttribute("aria-label");
  }

  it("keeps toolbar buttons out of the Tab order", async () => {
    await renderToolbar();

    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((button) => button.tabIndex === -1)).toBe(true);
  });

  it("moves between enabled buttons with arrow, Home, and End keys", async () => {
    await renderToolbar(true);
    container
      .querySelector<HTMLButtonElement>('button[aria-label="Heading 1"]')
      ?.focus();

    pressInToolbar("ArrowRight");
    expect(focusedLabel()).toBe("Heading 2");
    pressInToolbar("End");
    expect(focusedLabel()).toBe("Table");
    pressInToolbar("ArrowRight");
    expect(focusedLabel()).toBe("Heading 1");
    pressInToolbar("ArrowLeft");
    expect(focusedLabel()).toBe("Table");
    pressInToolbar("Home");
    expect(focusedLabel()).toBe("Heading 1");
  });

  it("enters the toolbar from its editor text on Alt+F10 only", async () => {
    container.setAttribute(EDITOR_ROOT_ATTRIBUTE, "");
    await renderToolbar();
    const editorText = document.createElement("div");
    container.append(editorText);
    const press = (altKey: boolean, key: string) =>
      focusToolbarOnShortcut(
        { altKey, key, preventDefault: vi.fn() },
        editorText,
      );

    expect(press(false, "F10")).toBe(false);
    expect(press(true, "F9")).toBe(false);
    expect(press(true, "F10")).toBe(true);
    expect(focusedLabel()).toBe("Heading 1");
    expect(
      focusToolbarOnShortcut(
        { altKey: true, key: "F10", preventDefault: vi.fn() },
        document.createElement("div"),
      ),
    ).toBe(false);
    editorText.remove();
    container.removeAttribute(EDITOR_ROOT_ATTRIBUTE);
  });
});
