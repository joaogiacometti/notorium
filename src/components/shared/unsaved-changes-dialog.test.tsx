import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe("UnsavedChangesDialog", () => {
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
  });

  // Regression: in review focus mode (overlay at z-110) the discard
  // confirmation must accept z-index overrides or it renders invisibly
  // behind the overlay.
  it("forwards className and overlayClassName to the dialog layers", async () => {
    await act(async () => {
      root.render(
        <UnsavedChangesDialog
          open
          onOpenChange={vi.fn()}
          onDiscard={vi.fn()}
          className="z-120"
          overlayClassName="z-120"
        />,
      );
    });

    const content = document.querySelector('[data-slot="dialog-content"]');
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');

    expect(content?.className).toContain("z-120");
    expect(overlay?.className).toContain("z-120");
  });
});
