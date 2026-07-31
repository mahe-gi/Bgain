import { Router } from "express";
import { healthRouter } from "./health.route.js";
import { authRouter } from "./auth.route.js";
import { userRouter } from "./user.route.js";
import { folderRouter } from "./folder.route.js";

export const apiRouter = Router();

apiRouter.use("/", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/folders", folderRouter);
