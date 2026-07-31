import bcrypt from "bcryptjs";
import { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/app-error.js";
import { CreateUserInput } from "../schemas/user.schema.js";
import { SafeUser } from "../types/auth.js";
import { toSafeUser } from "./auth.service.js";

export class UserService {
  static async listUsers(): Promise<SafeUser[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return users.map(toSafeUser);
  }

  static async createUser(input: CreateUserInput): Promise<SafeUser> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email }
    });

    if (existing) {
      throw new AppError(409, "EMAIL_ALREADY_EXISTS", "A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    try {
      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role
        }
      });

      return toSafeUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(409, "EMAIL_ALREADY_EXISTS", "A user with this email already exists");
      }
      throw error;
    }
  }
}
