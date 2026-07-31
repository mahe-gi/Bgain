import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service.js";
import { ApiResponse } from "../types/api.js";
import { SafeUser } from "../types/auth.js";

export class UserController {
  static async listUsers(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const users = await UserService.listUsers();
      const response: ApiResponse<{ users: SafeUser[] }> = {
        success: true,
        data: { users }
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  static async createUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await UserService.createUser(req.body);
      const response: ApiResponse<{ user: SafeUser }> = {
        success: true,
        data: { user }
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }
}
