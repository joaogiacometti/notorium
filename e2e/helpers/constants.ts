export const e2eUser = {
  name: process.env.E2E_USER_NAME ?? "Notorium E2E User",
  email: process.env.E2E_USER_EMAIL ?? "e2e-user@notorium.local",
  password: process.env.E2E_USER_PASSWORD ?? "notorium-e2e-password",
};

export const e2eStorageStatePath =
  process.env.E2E_STORAGE_STATE_PATH ?? "e2e/.auth/user.json";

export const e2eSubjectNames = {
  created: "E2E Subject Created",
  updated: "E2E Subject Updated",
};
