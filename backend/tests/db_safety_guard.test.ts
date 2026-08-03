import { describe, it, expect } from "vitest";
import { validateTestDatabaseSafety } from "../src/config/db-safety.js";
import { getEffectiveDatabaseUrl, env } from "../src/config/env.js";

describe("Database Safety Guard Unit Tests", () => {
  const dummyDevUrl =
    "postgresql://dev_user:secret_password_123@ep-cool-cloud-123456.us-east-2.aws.neon.tech:5432/neondb?sslmode=require&schema=public";

  it("1. Missing TEST_DATABASE_URL is rejected", () => {
    expect(() => validateTestDatabaseSafety(undefined, dummyDevUrl)).toThrow(
      "Integration tests refused to start: configure a dedicated TEST_DATABASE_URL."
    );
    expect(() => validateTestDatabaseSafety("", dummyDevUrl)).toThrow(
      "Integration tests refused to start: configure a dedicated TEST_DATABASE_URL."
    );
  });

  it("2. Exact same URL is rejected", () => {
    expect(() => validateTestDatabaseSafety(dummyDevUrl, dummyDevUrl)).toThrow(
      "Integration tests refused to start: TEST_DATABASE_URL targets the same database instance/schema as DATABASE_URL."
    );
  });

  it("3. Different credentials for the same database are rejected", () => {
    const diffCredsUrl =
      "postgresql://other_user:different_password_456@ep-cool-cloud-123456.us-east-2.aws.neon.tech:5432/neondb?sslmode=require&schema=public";
    expect(() => validateTestDatabaseSafety(diffCredsUrl, dummyDevUrl)).toThrow(
      "Integration tests refused to start: TEST_DATABASE_URL targets the same database instance/schema as DATABASE_URL."
    );
  });

  it("4. Different SSL/query parameters for the same database are rejected", () => {
    const diffParamsUrl =
      "postgresql://dev_user:secret_password_123@ep-cool-cloud-123456.us-east-2.aws.neon.tech:5432/neondb?sslmode=verify-full&connect_timeout=15&pooling=true";
    expect(() => validateTestDatabaseSafety(diffParamsUrl, dummyDevUrl)).toThrow(
      "Integration tests refused to start: TEST_DATABASE_URL targets the same database instance/schema as DATABASE_URL."
    );
  });

  it("5. Neon direct and -pooler URLs for the same endpoint are rejected", () => {
    const poolerUrl =
      "postgresql://dev_user:secret_password_123@ep-cool-cloud-123456-pooler.us-east-2.aws.neon.tech:5432/neondb?sslmode=require";
    expect(() => validateTestDatabaseSafety(poolerUrl, dummyDevUrl)).toThrow(
      "Integration tests refused to start: TEST_DATABASE_URL targets the same database instance/schema as DATABASE_URL."
    );
  });

  it("6. A different Neon endpoint is accepted", () => {
    const diffEndpointUrl =
      "postgresql://test_user:pass@ep-other-branch-789012.us-east-2.aws.neon.tech:5432/neondb?sslmode=require";
    expect(validateTestDatabaseSafety(diffEndpointUrl, dummyDevUrl)).toBe(diffEndpointUrl);
  });

  it("7. A different database name is accepted", () => {
    const diffDbUrl =
      "postgresql://dev_user:secret_password_123@ep-cool-cloud-123456.us-east-2.aws.neon.tech:5432/isolated_test_db?sslmode=require";
    expect(validateTestDatabaseSafety(diffDbUrl, dummyDevUrl)).toBe(diffDbUrl);
  });

  it("8. A different schema is accepted", () => {
    const diffSchemaUrl =
      "postgresql://dev_user:secret_password_123@ep-cool-cloud-123456.us-east-2.aws.neon.tech:5432/neondb?schema=test_schema";
    expect(validateTestDatabaseSafety(diffSchemaUrl, dummyDevUrl)).toBe(diffSchemaUrl);
  });

  it("9. Malformed URLs fail safely", () => {
    expect(() => validateTestDatabaseSafety("not-a-valid-url", dummyDevUrl)).toThrow(
      "Integration tests refused to start: invalid TEST_DATABASE_URL format."
    );
  });

  it("10. Errors never expose credentials, hostname, or complete URLs", () => {
    try {
      validateTestDatabaseSafety(dummyDevUrl, dummyDevUrl);
    } catch (err) {
      if (err instanceof Error) {
        expect(err.message).not.toContain("secret_password_123");
        expect(err.message).not.toContain("ep-cool-cloud-123456");
        expect(err.message).not.toContain("postgresql://");
        expect(err.message).toBe(
          "Integration tests refused to start: TEST_DATABASE_URL targets the same database instance/schema as DATABASE_URL."
        );
      }
    }
  });

  it("11 & 12. Development and production startup use DATABASE_URL", () => {
    const originalEnv = env.NODE_ENV;

    // Simulate development environment
    (env as { NODE_ENV: string }).NODE_ENV = "development";
    expect(getEffectiveDatabaseUrl()).toBe(env.DATABASE_URL);

    // Simulate production environment
    (env as { NODE_ENV: string }).NODE_ENV = "production";
    expect(getEffectiveDatabaseUrl()).toBe(env.DATABASE_URL);

    // Restore original NODE_ENV
    (env as { NODE_ENV: string }).NODE_ENV = originalEnv;
  });
});
