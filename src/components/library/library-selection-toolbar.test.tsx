import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LibrarySelectionToolbar } from "@/components/library/library-selection-toolbar";
import { TooltipProvider } from "@/components/ui/tooltip";

function render(props: { total: number; selectedCount: number }) {
  return renderToStaticMarkup(
    <TooltipProvider>
      <LibrarySelectionToolbar
        total={props.total}
        selectedCount={props.selectedCount}
        onDelete={vi.fn()}
        onClearSelection={vi.fn()}
      />
    </TooltipProvider>,
  );
}

describe("LibrarySelectionToolbar", () => {
  it("shows the total book count when nothing is selected", () => {
    const markup = render({ total: 7, selectedCount: 0 });
    expect(markup).toContain("7 books");
    expect(markup).not.toContain("selected");
  });

  it("uses the singular label for a single selection", () => {
    expect(render({ total: 7, selectedCount: 1 })).toContain("1 selected");
  });

  it("uses the plural label for multiple selections", () => {
    expect(render({ total: 7, selectedCount: 3 })).toContain("3 selected");
  });

  it("renders the delete and clear actions", () => {
    const markup = render({ total: 7, selectedCount: 2 });
    expect(markup).toContain("Delete");
    expect(markup).toContain("Clear selection");
  });
});
