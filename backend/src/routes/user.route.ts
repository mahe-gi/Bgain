import { Router } from "express";
import { UserController } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createUserSchema } from "../schemas/user.schema.js";

export const userRouter = Router();

// Protect all user routes with Admin authorization
userRouter.use(authenticate, requireAdmin);

userRouter.get("/", UserController.listUsers);
userRouter.post("/", validateBody(createUserSchema), UserController.createUser);
