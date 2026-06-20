import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowCloseGuard } from "@/lib/editor/use-window-close-guard";

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

let container: HTMLElement;
let root: Root;
let setRequestClose: (next: () => void) => void = () => {};

interface HarnessProps {
  register?: (request: () => void) => () => void;
  initialRequestClose: () => void;
}

function Harness({ register, initialRequestClose }: Readonly<HarnessProps>) {
  const [requestClose, setter] = useState(() => initialRequestClose);
  setRequestClose = (next) => setter(() => next);
  useWindowCloseGuard(register, requestClose);
  return null;
}

beforeEach(() => {
  (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("useWindowCloseGuard", () => {
  it("registers a wrapper that invokes the latest requestClose", () => {
    let registered: (() => void) | null = null;
    const register = (request: () => void) => {
      registered = request;
      return () => {
        registered = null;
      };
    };
    const first = vi.fn();
    act(() => {
      root.render(<Harness register={register} initialRequestClose={first} />);
    });

    const second = vi.fn();
    act(() => setRequestClose(second));
    act(() => registered?.());

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("does nothing when no register is provided", () => {
    const request = vi.fn();
    expect(() => {
      act(() => {
        root.render(<Harness initialRequestClose={request} />);
      });
    }).not.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it("unregisters on unmount", () => {
    const unregister = vi.fn();
    const register = () => unregister;
    act(() => {
      root.render(
        <Harness register={register} initialRequestClose={() => {}} />,
      );
    });

    act(() => root.unmount());

    expect(unregister).toHaveBeenCalledTimes(1);
  });
});
