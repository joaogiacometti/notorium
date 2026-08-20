/**
 * Preserves verified TLS semantics explicitly for hosted PostgreSQL URLs.
 *
 * @example normalizeDatabaseConnectionString("postgresql://localhost/app")
 */
export function normalizeDatabaseConnectionString(
  databaseUrlValue: string,
): string {
  const databaseUrl = new URL(databaseUrlValue);
  const isLocalDatabase =
    databaseUrl.hostname === "localhost" ||
    databaseUrl.hostname === "127.0.0.1";

  if (isLocalDatabase) {
    return databaseUrlValue;
  }

  databaseUrl.searchParams.set("sslmode", "verify-full");
  return databaseUrl.toString();
}
