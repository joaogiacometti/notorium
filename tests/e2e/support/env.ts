export interface E2ECredentials {
  email: string;
  name: string;
  password: string;
}

export type E2EUserKind = "approved" | "pending" | "blocked";

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
    email: `e2e-${kind}@example.com`,
    name: `E2E ${kind} user`,
    password,
  };
}
