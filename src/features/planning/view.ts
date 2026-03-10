export const planningViewValues = ["assessments", "calendar"] as const;

export type PlanningView = (typeof planningViewValues)[number];

export function resolvePlanningView(view: string | undefined): PlanningView {
  return view === "calendar" ? "calendar" : "assessments";
}
