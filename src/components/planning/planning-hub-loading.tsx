"use client";

import { useSearchParams } from "next/navigation";
import { PlanningHubLoadingContent } from "./planning-hub-loading-content";

export function PlanningHubLoading() {
  const searchParams = useSearchParams();

  return <PlanningHubLoadingContent view={searchParams.get("view")} />;
}
