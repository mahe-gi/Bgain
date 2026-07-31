import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { LoginInput } from "../schemas/auth.schema.js";
import { SafeUser, LoginResponseData } from "../types/auth.js";
import { Role } from "../generated/prisma/index.js";

export const toSafeUser = (user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}): SafeUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString()
});

export class AuthService {
  static async login(input: LoginInput): Promise<LoginResponseData> {
    const user = await prisma.user.findUnique({
      where: { email: input.email }
    });

    if (!user) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const accessToken = jwt.sign({ sub: user.id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]
    });

    return {
      accessToken,
      user: toSafeUser(user)
    };
  }

  static async getUserById(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    return toSafeUser(user);
  }
}
