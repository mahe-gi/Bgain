import dotenv from "dotenv";
import path from "path";

// Force test environment
process.env.NODE_ENV = "test";

// Load test environment files before any modules or Prisma clients initialize
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
