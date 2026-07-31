import { Router } from "express";
import { healthRouter } from "./health.route.js";
import { authRouter } from "./auth.route.js";
import { userRouter } from "./user.route.js";
import { folderRouter } from "./folder.route.js";
import { fileRouter } from "./file.route.js";
import { dashboardRouter } from "./dashboard.route.js";
import { searchRouter } from "./search.route.js";

export const apiRouter = Router();

apiRouter.use("/", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/folders", folderRouter);
apiRouter.use("/files", fileRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/search", searchRouter);
