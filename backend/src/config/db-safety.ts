/**
 * Fail-closed safety guard for database connections during test runs.
 * Prevents test suites from running against development or production databases.
 */

export interface DatabaseIdentity {
  host: string;
  port: string;
  dbName: string;
  schema: string;
}

export function normalizeDatabaseIdentity(urlString: string): DatabaseIdentity {
  try {
    const url = new URL(urlString.trim());
    let host = url.hostname.toLowerCase();

    // Neon endpoint normalization: strip '-pooler' suffix from the first domain label if present
    const hostParts = host.split(".");
    if (hostParts.length > 0 && hostParts[0].endsWith("-pooler")) {
      hostParts[0] = hostParts[0].slice(0, -"-pooler".length);
      host = hostParts.join(".");
    }

    const port = url.port || "5432";
    const rawPath = url.pathname.replace(/^\//, "");
    const dbName = rawPath ? decodeURIComponent(rawPath) : "postgres";
    const schema = (url.searchParams.get("schema") || "public").toLowerCase();

    return { host, port, dbName, schema };
  } catch {
    throw new Error("Integration tests refused to start: invalid TEST_DATABASE_URL format.");
  }
}

export function areDatabaseIdentitiesEqual(id1: DatabaseIdentity, id2: DatabaseIdentity): boolean {
  return (
    id1.host === id2.host &&
    id1.port === id2.port &&
    id1.dbName === id2.dbName &&
    id1.schema === id2.schema
  );
}

export function validateTestDatabaseSafety(testUrl?: string, devUrl?: string): string {
  if (!testUrl || !testUrl.trim()) {
    throw new Error(
      "Integration tests refused to start: configure a dedicated TEST_DATABASE_URL."
    );
  }

  const testIdentity = normalizeDatabaseIdentity(testUrl);

  if (devUrl && devUrl.trim()) {
    const devIdentity = normalizeDatabaseIdentity(devUrl);
    if (areDatabaseIdentitiesEqual(testIdentity, devIdentity)) {
      throw new Error(
        "Integration tests refused to start: TEST_DATABASE_URL targets the same database instance/schema as DATABASE_URL."
      );
    }
  }

  return testUrl.trim();
}
