import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { prisma } from "../lib/prisma.js";
import { toSafeUser } from "../services/auth.service.js";
import { JwtPayload } from "../types/auth.js";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    if (!decoded || typeof decoded.sub !== "string" || !decoded.sub) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub }
    });

    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    req.user = toSafeUser(user);
    next();
  } catch (err) {
    next(err);
  }
};
