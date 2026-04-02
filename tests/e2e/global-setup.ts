import { resetE2EInstanceAuthState } from "./support/db";

export default async function globalSetup() {
  await resetE2EInstanceAuthState();
}
