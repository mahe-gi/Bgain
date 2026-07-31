import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../src/lib/prisma.js";

dotenv.config();

const seedEnvSchema = z.object({
  SEED_ADMIN_NAME: z
    .string()
    .trim()
    .min(2, "SEED_ADMIN_NAME must be at least 2 characters")
    .max(100, "SEED_ADMIN_NAME must be at most 100 characters"),
  SEED_ADMIN_EMAIL: z
    .string()
    .trim()
    .email("Invalid SEED_ADMIN_EMAIL")
    .transform((val) => val.toLowerCase()),
  SEED_ADMIN_PASSWORD: z
    .string()
    .min(8, "SEED_ADMIN_PASSWORD must be at least 8 characters"),
  SEED_VIEWER_NAME: z
    .string()
    .trim()
    .min(2, "SEED_VIEWER_NAME must be at least 2 characters")
    .max(100, "SEED_VIEWER_NAME must be at most 100 characters"),
  SEED_VIEWER_EMAIL: z
    .string()
    .trim()
    .email("Invalid SEED_VIEWER_EMAIL")
    .transform((val) => val.toLowerCase()),
  SEED_VIEWER_PASSWORD: z
    .string()
    .min(8, "SEED_VIEWER_PASSWORD must be at least 8 characters")
});

async function seed() {
  const result = seedEnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Seed environment validation failed:", result.error.format());
    process.exit(1);
  }

  const {
    SEED_ADMIN_NAME,
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD,
    SEED_VIEWER_NAME,
    SEED_VIEWER_EMAIL,
    SEED_VIEWER_PASSWORD
  } = result.data;

  const adminHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);
  const viewerHash = await bcrypt.hash(SEED_VIEWER_PASSWORD, 12);

  // Upsert Admin
  const admin = await prisma.user.upsert({
    where: { email: SEED_ADMIN_EMAIL },
    update: {
      name: SEED_ADMIN_NAME,
      passwordHash: adminHash,
      role: "ADMIN"
    },
    create: {
      name: SEED_ADMIN_NAME,
      email: SEED_ADMIN_EMAIL,
      passwordHash: adminHash,
      role: "ADMIN"
    }
  });

  // Upsert Viewer
  const viewer = await prisma.user.upsert({
    where: { email: SEED_VIEWER_EMAIL },
    update: {
      name: SEED_VIEWER_NAME,
      passwordHash: viewerHash,
      role: "VIEWER"
    },
    create: {
      name: SEED_VIEWER_NAME,
      email: SEED_VIEWER_EMAIL,
      passwordHash: viewerHash,
      role: "VIEWER"
    }
  });

  console.log(`Successfully seeded Admin account: ${admin.email} (Role: ${admin.role})`);
  console.log(`Successfully seeded Viewer account: ${viewer.email} (Role: ${viewer.role})`);
}

seed()
  .catch((e) => {
    console.error("Error running seed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
