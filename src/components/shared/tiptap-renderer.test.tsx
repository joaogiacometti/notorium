import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TiptapRenderer } from "@/components/shared/tiptap-renderer";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe("TiptapRenderer", () => {
  it.each([
    ["front", "<p>Prompt</p>", "P"],
    ["back", "<ul><li><p>Answer</p></li></ul>", "UL"],
  ])(
    "trims saved trailing blank paragraphs from the %s",
    async (_, html, tag) => {
      (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
      const container = document.createElement("div");
      const root = createRoot(container);
      await act(async () => {
        root.render(
          <TiptapRenderer content={`${html}<p>&nbsp;</p><p><br></p>`} />,
        );
      });
      const prose = container.querySelector(".ProseMirror");
      expect(prose?.children).toHaveLength(1);
      expect(prose?.lastElementChild?.tagName).toBe(tag);
      act(() => root.unmount());
    },
  );

  it("shows the fallback before the editor exists", () => {
    const markup = renderToStaticMarkup(
      <TiptapRenderer content="<p>Rich</p>" fallback={<p>Plain</p>} />,
    );

    expect(markup).toBe("<p>Plain</p>");
  });

  it("trims trailing blanks when the displayed content changes", async () => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(<TiptapRenderer content="<p>First</p>" />);
    });
    await act(async () => {
      root.render(<TiptapRenderer content="<p>Next</p><p><br></p>" />);
    });
    const prose = container.querySelector(".ProseMirror");
    expect(prose?.textContent).toBe("Next");
    expect(prose?.children).toHaveLength(1);
    act(() => root.unmount());
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

  it("does not add an empty paragraph after a closing list or code block", async () => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <TiptapRenderer content="<ul><li><p>Item</p></li></ul><pre><code>x</code></pre>" />,
      );
    });

    const prose = container.querySelector(".ProseMirror");
    expect(prose?.lastElementChild?.tagName).toBe("PRE");
    act(() => root.unmount());
  });
});
