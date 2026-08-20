import { describe, expect, it } from "vitest";
import { normalizeDatabaseConnectionString } from "@/db/connection-string";

describe("normalizeDatabaseConnectionString", () => {
  it("uses explicit full certificate verification for hosted databases", () => {
    const databaseUrl =
      "postgresql://user:password@db.example.com/notorium?sslmode=require&channel_binding=require";

    expect(normalizeDatabaseConnectionString(databaseUrl)).toBe(
      "postgresql://user:password@db.example.com/notorium?sslmode=verify-full&channel_binding=require",
    );
  });

  it("leaves local database connections unchanged", () => {
    const databaseUrl =
      "postgresql://postgres:password@localhost:5432/notorium";

    expect(normalizeDatabaseConnectionString(databaseUrl)).toBe(databaseUrl);
  });
});
