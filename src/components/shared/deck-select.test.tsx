import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeckSelect } from "@/components/shared/deck-select";
import type { DeckOption } from "@/lib/server/api-contracts";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

const decks: DeckOption[] = [
  {
    id: "deck-1",
    userId: "user-1",
    parentDeckId: null,
    name: "Spanish",
    description: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    path: "Languages::Spanish",
  },
  {
    id: "deck-2",
    userId: "user-1",
    parentDeckId: "deck-1",
    name: "Verbs",
    description: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    path: "Languages::Spanish::Verbs",
  },
];

function getCombobox(container: HTMLElement): HTMLButtonElement {
  const combobox = container.querySelector('button[role="combobox"]');

  if (!(combobox instanceof HTMLButtonElement)) {
    throw new Error("Expected combobox trigger button");
  }

  return combobox;
}

function getSearchInput(): HTMLInputElement | null {
  const input = document.body.querySelector('[data-slot="command-input"]');

  return input instanceof HTMLInputElement ? input : null;
}

function getCommandItems(): HTMLElement[] {
  return Array.from(
    document.body.querySelectorAll('[data-slot="command-item"]'),
  ).filter((item): item is HTMLElement => item instanceof HTMLElement);
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;

  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("DeckSelect", () => {
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

  it("renders the selected deck path", async () => {
    await act(async () => {
      root.render(
        <DeckSelect value="deck-2" onChange={vi.fn()} decks={decks} />,
      );
    });

    expect(getCombobox(container).textContent).toContain(
      "Languages::Spanish::Verbs",
    );
  });

  it("filters options by path as the user types", async () => {
    await act(async () => {
      root.render(<DeckSelect value={null} onChange={vi.fn()} decks={decks} />);
    });

    await act(async () => {
      getCombobox(container).click();
    });

    const input = getSearchInput();
    expect(input).toBeTruthy();

    await act(async () => {
      if (!input) {
        return;
      }

      setInputValue(input, "verbs");
    });

    const items = getCommandItems();

    expect(items).toHaveLength(1);
    expect(items[0]?.textContent).toContain("Languages::Spanish::Verbs");
  });

  it("calls onChange with the selected deck id", async () => {
    const onChange = vi.fn();

    await act(async () => {
      root.render(
        <DeckSelect value={null} onChange={onChange} decks={decks} />,
      );
    });

    await act(async () => {
      getCombobox(container).click();
    });

    const verbsOption = getCommandItems().find((item) =>
      item.textContent?.includes("Languages::Spanish::Verbs"),
    );

    expect(verbsOption).toBeTruthy();

    await act(async () => {
      verbsOption?.click();
    });

    expect(onChange).toHaveBeenCalledWith("deck-2");
  });

  it("shows an empty state when no decks match the query", async () => {
    await act(async () => {
      root.render(<DeckSelect value={null} onChange={vi.fn()} decks={decks} />);
    });

    await act(async () => {
      getCombobox(container).click();
    });

    const input = getSearchInput();

    await act(async () => {
      if (!input) {
        return;
      }

      setInputValue(input, "biology");
    });

    expect(document.body.textContent).toContain("No decks found.");
    expect(getCommandItems()).toHaveLength(0);
  });

  it("prevents opening and changing when disabled", async () => {
    const onChange = vi.fn();

    await act(async () => {
      root.render(
        <DeckSelect value={null} onChange={onChange} decks={decks} disabled />,
      );
    });

    const combobox = getCombobox(container);

    expect(combobox.disabled).toBe(true);

    await act(async () => {
      combobox.click();
    });

    expect(getSearchInput()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
