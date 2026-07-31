import { Request, Response, NextFunction } from "express";
import { DashboardService, DashboardData } from "../services/dashboard.service.js";
import { ApiResponse } from "../types/api.js";

export class DashboardController {
  static async getDashboard(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = await DashboardService.getDashboardData();
      const response: ApiResponse<DashboardData> = {
        success: true,
        data
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
