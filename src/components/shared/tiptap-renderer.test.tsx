import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TiptapRenderer } from "@/components/shared/tiptap-renderer";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe("TiptapRenderer", () => {
  it("shows the fallback before the editor exists", () => {
    const markup = renderToStaticMarkup(
      <TiptapRenderer content="<p>Rich</p>" fallback={<p>Plain</p>} />,
    );

    expect(markup).toBe("<p>Plain</p>");
  });

  it("replaces the fallback with the rendered content", async () => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <TiptapRenderer content="<p>Rich</p>" fallback={<p>Plain</p>} />,
      );
    });

    expect(container.textContent).toBe("Rich");
    act(() => root.unmount());
  });
});
