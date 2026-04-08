import { randomBytes } from "node:crypto";

export interface E2ECredentials {
  email: string;
  name: string;
  password: string;
}

export type E2EUserKind = "approved" | "pending" | "blocked";

let cachedPassword: string | null = null;

function getE2EPassword(): string {
  if (!cachedPassword) {
    cachedPassword = randomBytes(16).toString("hex");
  }
  return cachedPassword;
}

export function getE2ECredentials(
  kind: E2EUserKind = "approved",
): E2ECredentials {
  return {
    email: `e2e-${kind}@example.com`,
    name: `E2E ${kind} user`,
    password: getE2EPassword(),
  };
}

export function getE2EWorkerCredentials(
  workerIndex: number,
  kind: E2EUserKind = "approved",
): E2ECredentials {
  return {
    email: `e2e-${kind}-worker-${workerIndex}@example.com`,
    name: `E2E ${kind} worker ${workerIndex}`,
    password: getE2EPassword(),
  };
}
