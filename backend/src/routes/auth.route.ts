import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { loginRateLimiter } from "../middleware/rate-limit.middleware.js";
import { loginSchema } from "../schemas/auth.schema.js";

export const authRouter = Router();

authRouter.post("/login", loginRateLimiter, validateBody(loginSchema), AuthController.login);
authRouter.get("/me", authenticate, AuthController.getMe);
