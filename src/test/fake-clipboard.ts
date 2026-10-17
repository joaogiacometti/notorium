type FakeClipboardItemData = Blob | Promise<Blob>;

interface FakeClipboardWrite {
  via: "writeText" | "write";
  text: string;
}

interface FakeClipboardInstallOptions {
  /** `false` simulates a browser without `ClipboardItem`. */
  clipboardItems?: boolean;
  /** Reject failed item content with a generic NotAllowedError, as Chrome can. */
  maskItemErrors?: boolean;
  /** Reject every write with this error, e.g. a blurred-document failure. */
  rejectWritesWith?: Error;
}

class FakeClipboardItem {
  readonly items: Record<string, FakeClipboardItemData>;

  constructor(items: Record<string, FakeClipboardItemData>) {
    this.items = items;
  }
}

/**
 * Stands in for `navigator.clipboard` and `ClipboardItem` in jsdom tests.
 * Like a browser, `write` waits for promised item content and rejects when it
 * rejects; every successful write records its `text/plain` content.
 *
 * @example
 * const clipboard = new FakeClipboard().install();
 * await writePendingTextToClipboard(Promise.resolve("Hi"));
 * expect(clipboard.lastText()).toBe("Hi");
 * clipboard.uninstall();
 */
export class FakeClipboard {
  readonly writes: FakeClipboardWrite[] = [];
  private readonly originalClipboard = navigator.clipboard;
  private readonly originalClipboardItem = globalThis.ClipboardItem;
  private maskItemErrors = false;
  private rejectWritesWith: Error | null = null;

  install({
    clipboardItems = true,
    maskItemErrors = false,
    rejectWritesWith,
  }: FakeClipboardInstallOptions = {}): this {
    this.maskItemErrors = maskItemErrors;
    this.rejectWritesWith = rejectWritesWith ?? null;
    defineGlobal(navigator, "clipboard", {
      writeText: (text: string) => this.recordText(text),
      write: (items: FakeClipboardItem[]) => this.recordItems(items),
    });
    defineGlobal(
      globalThis,
      "ClipboardItem",
      clipboardItems ? FakeClipboardItem : undefined,
    );
    return this;
  }

  uninstall(): void {
    defineGlobal(navigator, "clipboard", this.originalClipboard);
    defineGlobal(globalThis, "ClipboardItem", this.originalClipboardItem);
  }

  lastText(): string | undefined {
    return this.writes.at(-1)?.text;
  }

  private async recordText(text: string): Promise<void> {
    if (this.rejectWritesWith) throw this.rejectWritesWith;
    this.writes.push({ via: "writeText", text });
  }

  private async recordItems(items: FakeClipboardItem[]): Promise<void> {
    if (this.rejectWritesWith) throw this.rejectWritesWith;
    for (const item of items) {
      const plainText = await this.readItemText(item);
      this.writes.push({ via: "write", text: plainText });
    }
  }

  private async readItemText(item: FakeClipboardItem): Promise<string> {
    try {
      return (await (await item.items["text/plain"])?.text()) ?? "";
    } catch (error) {
      if (!this.maskItemErrors) throw error;
      throw new DOMException("Write blocked", "NotAllowedError");
    }
  }
}

function defineGlobal(target: object, key: string, value: unknown): void {
  Object.defineProperty(target, key, { configurable: true, value });
}
