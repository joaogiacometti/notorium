import "server-only";
import { getServerEnv } from "@/env";

type EmailDeliveryEnv = Pick<
  ReturnType<typeof getServerEnv>,
  "RESEND_API_KEY" | "RESEND_FROM_EMAIL"
>;

export function isEmailDeliveryEnabled(env: EmailDeliveryEnv = getServerEnv()) {
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
}
