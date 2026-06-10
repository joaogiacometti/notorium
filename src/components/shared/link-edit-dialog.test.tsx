import type { Editor } from "@tiptap/react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type LinkDialogState,
  LinkEditDialog,
} from "@/components/shared/link-edit-dialog";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant,
    disabled,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    disabled?: boolean;
    onClick?: () => void;
    className?: string;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    onKeyDown,
    placeholder,
    autoFocus,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    onKeyDown?: (event: { key: string; preventDefault: () => void }) => void;
    placeholder?: string;
    autoFocus?: boolean;
  }) => (
    <input
      value={value ?? ""}
      data-placeholder={placeholder}
      data-autofocus={autoFocus ? "true" : "false"}
      onChange={(e) => onChange?.({ target: { value: e.target.value } })}
      onKeyDown={(e) => {
        onKeyDown?.({
          key: e.key,
          preventDefault: () => e.preventDefault(),
        });
      }}
    />
  ),
}));

interface RenderOptions {
  state: LinkDialogState | null;
  onClose?: () => void;
  editor?: Editor;
}

async function renderDialog(root: Root, options: RenderOptions) {
  const { state, onClose = vi.fn(), editor = createEditor() } = options;

  await act(async () => {
    root.render(
      <LinkEditDialog editor={editor} state={state} onClose={onClose} />,
    );
  });
}

function createEditor(): Editor {
  return {
    chain: () => ({
      focus: () => ({
        extendMarkRange: () => ({
          setLink: () => ({
            run: vi.fn(),
          }),
          unsetLink: () => ({
            run: vi.fn(),
          }),
        }),
        setLink: () => ({
          run: vi.fn(),
        }),
        insertContent: () => ({
          run: vi.fn(),
        }),
      }),
    }),
  } as unknown as Editor;
}

function createContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

describe("handleSave URL validation", () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: ReturnType<typeof createEditor>;
  let onClose: () => void;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = createContainer();
    root = createRoot(container);
    editor = createEditor();
    onClose = vi.fn();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("accepts a valid https URL in create mode", async () => {
    await renderDialog(root, {
      state: { mode: "create", selectedText: "click here" },
      editor,
      onClose,
    });

    const input = container.querySelector("input") as HTMLInputElement;
    const saveButton = findButton("Save", container)!;

    await act(async () => {
      setInputValue(input, "https://example.com");
      saveButton.click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("accepts a valid mailto URL", async () => {
    await renderDialog(root, {
      state: { mode: "create", selectedText: "email us" },
      editor,
      onClose,
    });

    const input = container.querySelector("input") as HTMLInputElement;
    const saveButton = findButton("Save", container)!;

    await act(async () => {
      setInputValue(input, "mailto:hello@example.com");
      saveButton.click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("accepts a bare domain and normalizes it to https", async () => {
    await renderDialog(root, {
      state: { mode: "create", selectedText: "link" },
      editor,
      onClose,
    });

    const input = container.querySelector("input") as HTMLInputElement;
    const saveButton = findButton("Save", container)!;

    await act(async () => {
      setInputValue(input, "example.com");
      saveButton.click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed bare domain like example..com", async () => {
    await renderDialog(root, {
      state: { mode: "create", selectedText: "broken" },
      editor,
    });

    const input = container.querySelector("input") as HTMLInputElement;
    const saveButton = findButton("Save", container)!;

    await act(async () => {
      setInputValue(input, "example..com");
      saveButton.click();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("rejects javascript: protocol", async () => {
    await renderDialog(root, {
      state: { mode: "create", selectedText: "dangerous" },
      editor,
    });

    const input = container.querySelector("input") as HTMLInputElement;
    const saveButton = findButton("Save", container)!;

    await act(async () => {
      setInputValue(input, "javascript:alert(1)");
      saveButton.click();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("rejects empty input", async () => {
    await renderDialog(root, {
      state: { mode: "create", selectedText: "link" },
      editor,
    });

    const saveButton = findButton("Save", container)!;
    expect(saveButton.disabled).toBe(true);
  });

  it("rejects inputs without a dot that are not URLs", async () => {
    await renderDialog(root, {
      state: { mode: "create", selectedText: "test" },
      editor,
    });

    const input = container.querySelector("input") as HTMLInputElement;
    const saveButton = findButton("Save", container)!;

    await act(async () => {
      setInputValue(input, "foo");
      saveButton.click();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls setLink in create mode with selected text", async () => {
    const setLinkRun = vi.fn();
    const mockEditor = {
      chain: () => ({
        focus: () => ({
          setLink: () => ({
            run: setLinkRun,
          }),
        }),
      }),
    } as unknown as Editor;

    await renderDialog(root, {
      state: { mode: "create", selectedText: "click here" },
      editor: mockEditor,
    });

    const input = container.querySelector("input") as HTMLInputElement;

    await act(async () => {
      setInputValue(input, "https://example.com");
      findButton("Save", container)!.click();
    });

    expect(setLinkRun).toHaveBeenCalledTimes(1);
  });

  it("calls setLink in edit mode", async () => {
    const setLinkRun = vi.fn();
    const mockEditor = {
      chain: () => ({
        focus: () => ({
          extendMarkRange: () => ({
            setLink: () => ({
              run: setLinkRun,
            }),
          }),
        }),
      }),
      getAttributes: vi
        .fn()
        .mockReturnValue({ href: "https://old.example.com" }),
    } as unknown as Editor;

    await renderDialog(root, {
      state: { mode: "edit", href: "https://old.example.com" },
      editor: mockEditor,
    });

    const input = container.querySelector("input") as HTMLInputElement;

    await act(async () => {
      setInputValue(input, "https://new.example.com");
      findButton("Save", container)!.click();
    });

    expect(setLinkRun).toHaveBeenCalledTimes(1);
  });

  it("inserts URL as link label when selectedText is empty", async () => {
    const insertContentRun = vi.fn();
    const mockEditor = {
      chain: () => ({
        focus: () => ({
          insertContent: () => ({
            run: insertContentRun,
          }),
        }),
      }),
    } as unknown as Editor;

    await renderDialog(root, {
      state: { mode: "create", selectedText: "" },
      editor: mockEditor,
    });

    const input = container.querySelector("input") as HTMLInputElement;

    await act(async () => {
      setInputValue(input, "https://example.com");
      findButton("Save", container)!.click();
    });

    expect(insertContentRun).toHaveBeenCalledTimes(1);
  });

  it("unlinks in edit mode on remove click", async () => {
    const unsetLinkRun = vi.fn();
    const mockEditor = {
      chain: () => ({
        focus: () => ({
          extendMarkRange: () => ({
            unsetLink: () => ({
              run: unsetLinkRun,
            }),
          }),
        }),
      }),
    } as unknown as Editor;

    await renderDialog(root, {
      state: { mode: "edit", href: "https://example.com" },
      editor: mockEditor,
      onClose,
    });

    await act(async () => {
      findButton("Remove", container)!.click();
    });

    expect(unsetLinkRun).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows correct title in create mode", async () => {
    await renderDialog(root, {
      state: { mode: "create", selectedText: "link text" },
    });

    const title = container.querySelector("h2");
    expect(title?.textContent).toBe("Insert link");
  });

  it("shows correct title in edit mode and pre-fills URL", async () => {
    await renderDialog(root, {
      state: { mode: "edit", href: "https://example.com" },
    });

    const title = container.querySelector("h2");
    expect(title?.textContent).toBe("Edit link");

    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("https://example.com");
  });

  it("shows selected text hint in create mode", async () => {
    await renderDialog(root, {
      state: { mode: "create", selectedText: "click here" },
    });

    const hint = container.querySelector("p.text-sm");
    expect(hint?.textContent).toContain("click here");
  });

  it("saves on Enter key", async () => {
    await renderDialog(root, {
      state: { mode: "create", selectedText: "link" },
      editor,
      onClose,
    });

    const input = container.querySelector("input") as HTMLInputElement;

    await act(async () => {
      setInputValue(input, "https://example.com");
    });

    await act(async () => {
      const event = new Event("keydown", { bubbles: true });
      Object.defineProperty(event, "key", { value: "Enter" });
      input.dispatchEvent(event);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

function setInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  nativeInputValueSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function findButton(
  text: string,
  container: HTMLDivElement,
): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === text,
  );
}
