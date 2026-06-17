import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionConfirmationDialog } from "@/components/shared/action-confirmation-dialog";

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

describe("ActionConfirmationDialog", () => {
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

  it("uses destructive styling for irreversible confirmations", async () => {
    await renderDialog({
      root,
      confirmVariant: "destructive",
    });

    const confirmButton = findButton("Delete", container);

    expect(confirmButton?.dataset.variant).toBe("destructive");
  });

  it("uses primary styling for non-destructive confirmations", async () => {
    await renderDialog({
      root,
      confirmLabel: "Confirm",
      confirmVariant: "default",
    });

    const confirmButton = findButton("Confirm", container);

    expect(confirmButton?.dataset.variant).toBe("default");
  });

  it("disables footer actions and shows pending copy while pending", async () => {
    await renderDialog({
      root,
      isPending: true,
      pendingLabel: "Deleting...",
    });

    expect(findButton("Cancel", container)?.disabled).toBe(true);
    expect(findButton("Deleting...", container)?.disabled).toBe(true);
  });

  it("supports confirm-only disabled state", async () => {
    await renderDialog({
      root,
      confirmDisabled: true,
    });

    expect(findButton("Cancel", container)?.disabled).toBe(false);
    expect(findButton("Delete", container)?.disabled).toBe(true);
  });
});

async function renderDialog({
  root,
  confirmLabel = "Delete",
  pendingLabel = "Deleting...",
  confirmVariant = "destructive",
  isPending = false,
  confirmDisabled = false,
}: {
  root: Root;
  confirmLabel?: string;
  pendingLabel?: string;
  confirmVariant?: "default" | "destructive";
  isPending?: boolean;
  confirmDisabled?: boolean;
}) {
  await act(async () => {
    root.render(
      <ActionConfirmationDialog
        open
        onOpenChange={vi.fn()}
        title="Delete Item"
        description="Confirm the action."
        confirmLabel={confirmLabel}
        pendingLabel={pendingLabel}
        confirmVariant={confirmVariant}
        isPending={isPending}
        onConfirm={vi.fn()}
        confirmDisabled={confirmDisabled}
      />,
    );
  });
}

function findButton(text: string, container: HTMLDivElement) {
  return Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === text,
  );
}
