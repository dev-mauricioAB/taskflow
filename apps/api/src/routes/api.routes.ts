// routes/api.ts
import { Router } from "express";
import { protect } from "../keycloak";
import { taskRouter } from "./task.routes";
import { userRouter } from "./user.routes";
import { projectRouter } from "./project.routes";
import { activityRouter } from "./activity.routes";

const apiRouter = Router();

// middleware applied to everything under /api
apiRouter.use(protect());

// resource routers
apiRouter.use("/tasks", taskRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/projects", projectRouter);
apiRouter.use("/activity", activityRouter);

export { apiRouter };
