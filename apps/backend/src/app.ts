import express, { Application } from "express";
import cors from "cors";
import { taskRouter } from "./routes/task.routes";
import { userRouter } from "./routes/user.routes";
import { projectRoutes } from "./routes/project.routes";
import { activityRoutes } from "./routes/activity.routes";
import { logger } from "./infra/http/middlewares/logging.middleware";
import { errorHandler } from "./infra/http/middlewares/error-handler.middleware";

export const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(logger);

app.use("/tasks", taskRouter);
app.use("/users", userRouter);
app.use("/projects", projectRoutes);
app.use("/activity", activityRoutes);

app.use(errorHandler);
