import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSessionCardView } from "@/components/flashcards/review/use-session-card-view";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

type CardView = ReturnType<typeof useSessionCardView>;

function CardViewProbe({
  onRender,
}: Readonly<{ onRender: (v: CardView) => void }>) {
  onRender(useSessionCardView());
  return null;
}

describe("useSessionCardView", () => {
  let root: Root;
  let view: CardView;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    root = createRoot(document.createElement("div"));
    act(() => {
      root.render(<CardViewProbe onRender={(v) => (view = v)} />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it("starts hidden with every dialog closed", () => {
    expect(view.revealed).toBe(false);
    expect(view.isDialogOpen).toBe(false);
  });

  it("reports a dialog as open when any dialog is open", () => {
    act(() => view.setDeleteOpen(true));

    expect(view.isDialogOpen).toBe(true);
  });

  it("resets the reveal and closes every dialog", () => {
    act(() => {
      view.setRevealed(true);
      view.setEditing(true);
      view.setResetOpen(true);
    });
    act(() => view.resetCardViewState());

    expect(view.revealed).toBe(false);
    expect(view.isDialogOpen).toBe(false);
  });
});
