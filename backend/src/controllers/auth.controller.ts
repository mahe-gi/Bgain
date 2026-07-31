import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service.js";
import { ApiResponse } from "../types/api.js";
import { SafeUser, LoginResponseData } from "../types/auth.js";
import { AppError } from "../utils/app-error.js";

export class AuthController {
  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = await AuthService.login(req.body);
      const response: ApiResponse<LoginResponseData> = {
        success: true,
        data
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async getMe(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(401, "UNAUTHORIZED", "Authentication required");
      }
      const response: ApiResponse<{ user: SafeUser }> = {
        success: true,
        data: {
          user: req.user
        }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
