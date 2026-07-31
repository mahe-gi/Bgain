import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const dashboardRouter = Router();

// GET /api/dashboard (Admin and Viewer)
dashboardRouter.get("/", authenticate, DashboardController.getDashboard);
