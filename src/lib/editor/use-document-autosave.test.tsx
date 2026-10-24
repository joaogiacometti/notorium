import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useDocumentAutosave } from "@/lib/editor/use-document-autosave";

class FakeDocumentPersistence {
  writes: string[] = [];
  fail = false;
  release: (() => void) | undefined;
  hold = false;

  async persist(value: string): Promise<boolean> {
    this.writes.push(value);
    if (this.hold)
      await new Promise<void>((resolve) => {
        this.release = resolve;
      });
    if (this.fail) throw new Error("Connection unavailable");
    return true;
  }
}

interface AutosaveHarnessProps {
  value: string;
  blocked?: boolean;
  documentId?: string;
}

let persistence: FakeDocumentPersistence;
let failures: number;
let root: Root;
let container: HTMLDivElement;

function AutosaveHarness({
  value,
  blocked,
  documentId = "note-1",
}: AutosaveHarnessProps) {
  const saving = useDocumentAutosave({
    documentId,
    value,
    initialValue: "original",
    blocked,
    persist: (next) => persistence.persist(next),
    onError: () => {
      failures += 1;
    },
  });
  return (
    <button type="button" onClick={saving.retry}>
      {saving.hasError ? "Retry" : saving.isSaving ? "Saving" : "Ready"}
    </button>
  );
}

async function renderDraft(
  value: string,
  blocked = false,
  documentId = "note-1",
) {
  await act(async () =>
    root.render(
      <AutosaveHarness
        value={value}
        blocked={blocked}
        documentId={documentId}
      />,
    ),
  );
}

async function advanceAutosave() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(800);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  failures = 0;
  persistence = new FakeDocumentPersistence();
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(async () => {
  persistence.fail = false;
  persistence.hold = false;
  await act(async () => {
    persistence.release?.();
    root.unmount();
  });
  vi.useRealTimers();
});

it("debounces one complete snapshot and skips unchanged content", async () => {
  await renderDraft("original");
  await advanceAutosave();
  expect(persistence.writes).toEqual([]);
  await renderDraft("first");
  await renderDraft("latest");
  await advanceAutosave();
  expect(persistence.writes).toEqual(["latest"]);
});

it("flushes edits on navigation before the debounce expires", async () => {
  await renderDraft("latest");
  await act(async () => root.render(null));
  expect(persistence.writes).toEqual(["latest"]);
});

it("serializes pending writes and coalesces intermediate edits", async () => {
  persistence.hold = true;
  await renderDraft("first");
  await advanceAutosave();
  await renderDraft("second");
  await advanceAutosave();
  await renderDraft("latest");
  expect(persistence.writes).toEqual(["first"]);
  persistence.hold = false;
  await act(async () => persistence.release?.());
  expect(persistence.writes).toEqual(["first", "latest"]);
});

it("finishes the latest queued edit after unmount", async () => {
  persistence.hold = true;
  await renderDraft("first");
  await advanceAutosave();
  await renderDraft("latest");
  await act(async () => root.render(null));
  persistence.hold = false;
  await act(async () => persistence.release?.());
  expect(persistence.writes).toEqual(["first", "latest"]);
});

it("keeps failed content dirty and retries without another edit", async () => {
  persistence.fail = true;
  await renderDraft("latest");
  await advanceAutosave();
  expect(failures).toBe(1);
  expect(container.textContent).toBe("Retry");
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  persistence.fail = false;
  await act(async () => container.querySelector("button")?.click());
  expect(persistence.writes).toEqual(["latest", "latest"]);
  expect(container.textContent).toBe("Ready");
});

it("waits for uploads and immediately saves the current snapshot when they settle", async () => {
  await renderDraft("before upload", true);
  await advanceAutosave();
  expect(persistence.writes).toEqual([]);
  await renderDraft("with image", false);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(persistence.writes).toEqual(["with image"]);
});

it("flushes the old document separately when the document changes", async () => {
  await renderDraft("old edit");
  await renderDraft("new edit", false, "note-2");
  await advanceAutosave();
  expect(persistence.writes).toEqual(["old edit", "new edit"]);
});

it("does not mark rejected typed results as saved or retry them in a loop", async () => {
  vi.spyOn(persistence, "persist").mockResolvedValue(false);
  await renderDraft("latest");
  await advanceAutosave();
  await advanceAutosave();
  expect(persistence.persist).toHaveBeenCalledTimes(1);
  expect(container.textContent).toBe("Retry");
  expect(failures).toBe(0);
});

it("restores the original snapshot when an in-flight edit is reverted", async () => {
  persistence.hold = true;
  await renderDraft("first");
  await advanceAutosave();
  await renderDraft("original");
  persistence.hold = false;
  await act(async () => persistence.release?.());
  expect(persistence.writes).toEqual(["first", "original"]);
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(false);
});
