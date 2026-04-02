import { resetE2EInstanceAuthState } from "./support/db";

export default async function globalTeardown() {
  await resetE2EInstanceAuthState();
}
