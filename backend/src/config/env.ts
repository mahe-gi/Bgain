import dotenv from "dotenv";
import path from "path";
import { z } from "zod";
import { validateTestDatabaseSafety } from "./db-safety.js";

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });
}
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z
    .string()
    .default("4000")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://localhost:3000")
    .transform((val) => val.split(",").map((origin) => origin.trim()).filter(Boolean)),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TEST_DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  STORAGE_ENDPOINT: z
    .string()
    .min(1, "STORAGE_ENDPOINT is required")
    .refine((val) => val.startsWith("https://"), {
      message: "STORAGE_ENDPOINT must start with https://"
    }),
  STORAGE_REGION: z.string().default("auto"),
  STORAGE_ACCESS_KEY_ID: z.string().min(1, "STORAGE_ACCESS_KEY_ID is required"),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1, "STORAGE_SECRET_ACCESS_KEY is required"),
  STORAGE_BUCKET: z.string().min(1, "STORAGE_BUCKET is required"),
  SIGNED_URL_TTL_SECONDS: z
    .string()
    .default("300")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  MAX_FILE_SIZE_MB: z
    .string()
    .default("10")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment configuration:", result.error.format());
    throw new Error("Invalid environment configuration");
  }
  return result.data;
};

export const env = parseEnv();

export function getEffectiveDatabaseUrl(): string {
  if (env.NODE_ENV === "test") {
    return validateTestDatabaseSafety(env.TEST_DATABASE_URL, env.DATABASE_URL);
  }
  return env.DATABASE_URL;
}
