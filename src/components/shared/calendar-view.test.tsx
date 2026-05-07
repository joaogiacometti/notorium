import { act } from "react";

import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarView } from "@/components/shared/calendar-view";
import type { PlanningCalendarData } from "@/features/planning/queries";
import type { CalendarEvent } from "@/lib/dates/calendar";

const { getCalendarEventsMock } = vi.hoisted(() => ({
  getCalendarEventsMock: vi.fn(),
}));

type ReactActEnvironmentGlobal = typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/actions/calendar", () => ({
  getCalendarEvents: getCalendarEventsMock,
}));

function getButtonByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find(
    (element) => element.textContent?.trim() === text,
  );
}

function getMonthNavigationButtons(container: HTMLElement) {
  return Array.from(container.querySelectorAll("button")).filter(
    (element) =>
      element.textContent?.trim() === "" &&
      element.querySelector("svg") !== null &&
      !element.hasAttribute("disabled"),
  );
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

function createEmptyCalendarData(): PlanningCalendarData {
  return {
    assessments: [],
    misses: [],
  };
}

function createCalendarEvents(): CalendarEvent[] {
  return [createAssessmentEvent(), createMissEvent()];
}

function createAssessmentEvent(): CalendarEvent {
  return {
    date: "2026-04-17",
    id: "a-assessment-1",
    kind: "assessment",
    meta: { status: "pending", type: "exam" },
    sourceId: "assessment-1",
    subjectId: "subject-1",
    subjectName: "Biology",
    title: "Cell structure exam",
  };
}

function createMissEvent(): CalendarEvent {
  return {
    date: "2026-04-17",
    id: "m-miss-1",
    kind: "miss",
    sourceId: "miss-1",
    subjectId: "subject-2",
    subjectName: "History",
    title: "Missed class",
  };
}

describe("CalendarView", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    getCalendarEventsMock.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    (globalThis as ReactActEnvironmentGlobal).IS_REACT_ACT_ENVIRONMENT = false;
    vi.clearAllMocks();
  });

  it("shows month-loading state in the calendar grid instead of the header controls", async () => {
    let resolveLatestRequest: ((value: PlanningCalendarData) => void) | null =
      null;

    getCalendarEventsMock.mockImplementation(
      () =>
        new Promise<PlanningCalendarData>((resolve) => {
          resolveLatestRequest = resolve;
        }),
    );

    await act(async () => {
      root.render(
        <CalendarView
          initialAnchorIso="2026-04-17"
          initialSelectedDateIso="2026-04-17"
          initialEvents={[]}
        />,
      );
    });

    const monthNavigationButtons = getMonthNavigationButtons(container);

    expect(monthNavigationButtons).toHaveLength(2);
    expect(
      container.querySelector('[data-testid="calendar-grid-loading"]'),
    ).toBe(null);

    await act(async () => {
      monthNavigationButtons[1]?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(
      container.querySelector('[data-testid="calendar-grid-loading"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain("May 2026");
    expect(
      container
        .querySelector('[data-testid="calendar-header"]')
        ?.querySelectorAll("svg"),
    ).toHaveLength(2);

    await act(async () => {
      resolveLatestRequest?.(createEmptyCalendarData());
    });

    await flushPromises();

    expect(
      container.querySelector('[data-testid="calendar-grid-loading"]'),
    ).toBe(null);
  });

  it("keeps the latest month visible when requests resolve out of order", async () => {
    const resolvers: Array<(value: PlanningCalendarData) => void> = [];

    getCalendarEventsMock.mockImplementation(
      () =>
        new Promise<PlanningCalendarData>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    await act(async () => {
      root.render(
        <CalendarView
          initialAnchorIso="2026-04-17"
          initialSelectedDateIso="2026-04-17"
          initialEvents={[]}
        />,
      );
    });

    await act(async () => {
      getMonthNavigationButtons(container)[1]?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    await act(async () => {
      getMonthNavigationButtons(container)[1]?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(container.textContent).toContain("June 2026");
    expect(getCalendarEventsMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolvers[0]?.(createEmptyCalendarData());
    });

    await flushPromises();

    expect(container.textContent).toContain("June 2026");
    expect(
      container.querySelector('[data-testid="calendar-grid-loading"]'),
    ).toBeTruthy();

    await act(async () => {
      resolvers[1]?.(createEmptyCalendarData());
    });

    await flushPromises();

    expect(container.textContent).toContain("June 2026");
    expect(
      container.querySelector('[data-testid="calendar-grid-loading"]'),
    ).toBe(null);
  });

  it("keeps the Today button available during month loading", async () => {
    let resolveLatestRequest: ((value: PlanningCalendarData) => void) | null =
      null;

    getCalendarEventsMock.mockImplementation(
      () =>
        new Promise<PlanningCalendarData>((resolve) => {
          resolveLatestRequest = resolve;
        }),
    );

    await act(async () => {
      root.render(
        <CalendarView
          initialAnchorIso="2026-04-17"
          initialSelectedDateIso="2026-04-17"
          initialEvents={[]}
        />,
      );
    });

    const nextMonthButton = getMonthNavigationButtons(container)[1];

    await act(async () => {
      nextMonthButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(getButtonByText(container, "Today")).toBeTruthy();
    expect(getButtonByText(container, "Today")?.hasAttribute("disabled")).toBe(
      false,
    );

    await act(async () => {
      resolveLatestRequest?.(createEmptyCalendarData());
    });

    await flushPromises();
  });

  it("shows selected-day detail with event count and planner rows", async () => {
    await act(async () => {
      root.render(
        <CalendarView
          initialAnchorIso="2026-04-17"
          initialSelectedDateIso="2026-04-17"
          initialEvents={createCalendarEvents()}
        />,
      );
    });

    const dayDetail = container.querySelector(
      '[data-testid="calendar-day-detail"]',
    );

    expect(dayDetail?.textContent).toContain("Friday, April 17");
    expect(dayDetail?.textContent).toContain("2 items");
    expect(dayDetail?.textContent).toContain("Cell structure exam");
    expect(dayDetail?.textContent).toContain("Biology · Exam");
    expect(dayDetail?.textContent).toContain("Missed class");
    expect(dayDetail?.textContent).toContain("History");
  });

  it("keeps selected-day event links pointed at source records", async () => {
    await act(async () => {
      root.render(
        <CalendarView
          initialAnchorIso="2026-04-17"
          initialSelectedDateIso="2026-04-17"
          initialEvents={createCalendarEvents()}
        />,
      );
    });

    const links = Array.from(
      container
        .querySelector('[data-testid="calendar-day-detail"]')
        ?.querySelectorAll("a") ?? [],
    ).map((link) => link.getAttribute("href"));

    expect(links).toContain(
      "/assessments/assessment-1?from=planning-assessments&subjectId=subject-1",
    );
    expect(links).toContain("/subjects/subject-2");
  });

  it("shows an intentional empty state for a selected day without events", async () => {
    await act(async () => {
      root.render(
        <CalendarView
          initialAnchorIso="2026-04-17"
          initialSelectedDateIso="2026-04-17"
          initialEvents={[]}
        />,
      );
    });

    const dayDetail = container.querySelector(
      '[data-testid="calendar-day-detail"]',
    );

    expect(dayDetail?.textContent).toContain("No items");
    expect(dayDetail?.textContent).toContain("Open day");
    expect(dayDetail?.textContent).toContain(
      "No assessments or attendance misses on this day.",
    );
  });
});
