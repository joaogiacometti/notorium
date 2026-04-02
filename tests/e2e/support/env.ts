export interface E2ECredentials {
  email: string;
  name: string;
  password: string;
}

export type E2EUserKind = "approved" | "pending" | "blocked";

const DEFAULT_E2E_EMAIL_PREFIX = "e2e-";
const E2E_EMAIL_PREFIX_PATTERN = /^[a-z0-9-]+$/;

export function getE2EEmailPrefix() {
  const configuredPrefix = process.env.E2E_EMAIL_PREFIX?.trim().toLowerCase();

  if (!configuredPrefix) {
    return DEFAULT_E2E_EMAIL_PREFIX;
  }

  if (!E2E_EMAIL_PREFIX_PATTERN.test(configuredPrefix)) {
    throw new Error(
      "E2E_EMAIL_PREFIX must contain only lowercase letters, numbers, or hyphens.",
    );
  }

  return configuredPrefix;
}

export function getE2ECredentials(
  kind: E2EUserKind = "approved",
): E2ECredentials {
  const password = process.env.E2E_USER_PASSWORD;

  if (!password) {
    throw new Error(
      "E2E_USER_PASSWORD environment variable is required for end-to-end tests. " +
        "Please set it in your environment or .env.local file.",
    );
  }

  return {
    email: `${getE2EEmailPrefix()}${kind}@example.com`,
    name: `E2E ${kind} user`,
    password,
  };
}

export function getE2EWorkerCredentials(
  workerIndex: number,
  kind: E2EUserKind = "approved",
): E2ECredentials {
  const password = process.env.E2E_USER_PASSWORD;

  if (!password) {
    throw new Error(
      "E2E_USER_PASSWORD environment variable is required for end-to-end tests. " +
        "Please set it in your environment or .env.local file.",
    );
  }

  return {
    email: `${getE2EEmailPrefix()}${kind}-worker-${workerIndex}@example.com`,
    name: `E2E ${kind} worker ${workerIndex}`,
    password,
  };
}
