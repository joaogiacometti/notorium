import "dotenv/config";
import { defineConfig } from "cypress";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { appEnv } from "@/env";
import type { userPlanEnum } from "./src/db/schema";
import { user } from "./src/db/schema";

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: "http://localhost:3000",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on) {
      const db = drizzle(appEnv.DATABASE_URL);

      on("task", {
        async setUserPlan({
          email,
          plan,
        }: {
          email: string;
          plan: (typeof userPlanEnum.enumValues)[number];
        }) {
          await db.update(user).set({ plan }).where(eq(user.email, email));
          return null;
        },
      });
    },
  },
});
