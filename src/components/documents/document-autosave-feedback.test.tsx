import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { DocumentAutosaveFeedback } from "@/components/documents/document-autosave-feedback";

it("shows pending feedback, offers retry on failure, and stays hidden when idle", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div");
  const root = createRoot(container);
  const retry = vi.fn();
  await act(async () =>
    root.render(
      <DocumentAutosaveFeedback
        isSaving={false}
        hasError={false}
        retry={retry}
      />,
    ),
  );
  expect(container.textContent).toBe("");
  await act(async () =>
    root.render(
      <DocumentAutosaveFeedback isSaving hasError={false} retry={retry} />,
    ),
  );
  expect(container.textContent).toContain("Saving");
  expect(container.querySelector("button")?.disabled).toBe(true);
  await act(async () =>
    root.render(
      <DocumentAutosaveFeedback isSaving={false} hasError retry={retry} />,
    ),
  );
  await act(async () => container.querySelector("button")?.click());
  expect(retry).toHaveBeenCalledOnce();
  await act(async () => root.unmount());
});
