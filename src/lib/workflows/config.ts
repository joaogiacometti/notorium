import "server-only";
import { getServerEnv } from "@/env";

type WorkflowsEnv = Pick<ReturnType<typeof getServerEnv>, "CRON_SECRET">;

export function areWorkflowsEnabled(env: WorkflowsEnv = getServerEnv()) {
  return Boolean(env.CRON_SECRET);
}
