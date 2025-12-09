import express, { Application } from "express";
import cors from "cors";

import { taskRouter } from "./routes/task.routes";
import { userRouter } from "./routes/user.routes";
import { projectRouter } from "./routes/project.routes";
import { activityRoutes } from "./routes/activity.routes";
import { logger } from "./infra/http/middlewares/logging.middleware";
import { errorHandler } from "./infra/http/middlewares/error-handler.middleware";
import {
  registerProjectLoggingSubscribers,
  registerTaskLoggingSubscribers,
  registerUserLoggingSubscribers,
  registerActivityLoggingSubscribers,
} from "@repo/core";
import {
  sessionMiddleware,
  keycloakMiddleware,
  protect,
  protectRole,
} from "./keycloak";

export const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(logger);

// Keycloak session + middleware
app.use(sessionMiddleware);
app.use(keycloakMiddleware);

// Protected routes
app.use("/tasks", protect(), taskRouter);
app.use("/users", protect(), userRouter);
app.use("/projects", protect(), projectRouter);
app.use("/activity", protect(), activityRoutes);

// Example role-protected route
app.get("/admin-only", protectRole("taskflow-api:full-access"), (_req, res) => {
  res.json({ ok: true });
});

app.use(errorHandler);

registerProjectLoggingSubscribers();
registerTaskLoggingSubscribers();
registerUserLoggingSubscribers();
registerActivityLoggingSubscribers();
