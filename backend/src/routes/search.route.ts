import { Router } from "express";
import { SearchController } from "../controllers/search.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const searchRouter = Router();

// GET /api/search?q=<text> (Admin and Viewer)
searchRouter.get("/", authenticate, SearchController.search);
