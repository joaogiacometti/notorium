import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SettingsRow,
  SettingsSearchProvider,
  SettingsSection,
} from "@/components/account/settings-section";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function renderWithQuery(query: string, root: Root) {
  act(() => {
    root.render(
      <SettingsSearchProvider query={query}>
        <SettingsSection title="Appearance">
          <SettingsRow label="Theme" keywords="dark light" />
          <SettingsRow label="Email" keywords="address" />
        </SettingsSection>
      </SettingsSearchProvider>,
    );
  });
}

describe("settings search filtering", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("shows every row and the section title when not searching", () => {
    renderWithQuery("", root);
    expect(container.textContent).toContain("Appearance");
    expect(container.textContent).toContain("Theme");
    expect(container.textContent).toContain("Email");
  });

  it("hides non-matching rows and the title while searching", () => {
    renderWithQuery("theme", root);
    expect(container.textContent).not.toContain("Appearance");
    expect(container.textContent).toContain("Theme");
    expect(container.textContent).not.toContain("Email");
  });

  it("matches on keywords as well as the label", () => {
    renderWithQuery("address", root);
    expect(container.textContent).toContain("Email");
    expect(container.textContent).not.toContain("Theme");
  });
});
