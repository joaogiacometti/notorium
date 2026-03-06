export const e2eSubjectsUser = {
  name: process.env.E2E_SUBJECTS_USER_NAME ?? "Notorium E2E Subjects User",
  email:
    process.env.E2E_SUBJECTS_USER_EMAIL ?? "e2e-subjects-user@notorium.local",
  password:
    process.env.E2E_SUBJECTS_USER_PASSWORD ?? "notorium-e2e-password-subjects",
};

export const e2eAuthUser = {
  name: process.env.E2E_AUTH_USER_NAME ?? "Notorium E2E Auth User",
  email: process.env.E2E_AUTH_USER_EMAIL ?? "e2e-auth-user@notorium.local",
  password: process.env.E2E_AUTH_USER_PASSWORD ?? "notorium-e2e-password-auth",
};

export const e2eSubjectsStorageStatePath =
  process.env.E2E_SUBJECTS_STORAGE_STATE_PATH ?? "e2e/.auth/subjects-user.json";

export const e2eSubjectNames = {
  created: "E2E Subject Created",
  updated: "E2E Subject Updated",
};
