import { Request, Response, NextFunction } from "express";
import { SearchService, SearchResultData } from "../services/search.service.js";
import { ApiResponse } from "../types/api.js";
import { searchSchema } from "../schemas/search.schema.js";
import { AppError } from "../utils/app-error.js";

export class SearchController {
  static async search(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedResult = searchSchema.safeParse(req.query);
      if (!parsedResult.success) {
        const message = parsedResult.error.errors.map((e) => e.message).join(", ");
        throw new AppError(400, "VALIDATION_ERROR", message);
      }

      const data = await SearchService.searchGlobal(parsedResult.data.q);
      const response: ApiResponse<SearchResultData> = {
        success: true,
        data
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
