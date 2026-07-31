import { z } from "zod";
import { Role } from "../generated/prisma/index.js";

export const createUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Invalid email address")
      .transform((val) => val.toLowerCase()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    role: z.nativeEnum(Role, {
      errorMap: () => ({ message: "Role must be ADMIN or VIEWER" })
    })
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
