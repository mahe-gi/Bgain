import { Request, Response } from "express";
import { ApiResponse } from "../types/api.js";

export const getHealth = (_req: Request, res: Response): void => {
  const response: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString()
    }
  };
  res.status(200).json(response);
};
