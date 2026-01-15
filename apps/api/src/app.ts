import express from "express";
import cors from "cors";
import { logger } from "./infra/http/middlewares/logging.middleware";
import { errorHandler } from "./infra/http/middlewares/error-handler.middleware";
import {
  registerProjectLoggingSubscribers,
  registerTaskLoggingSubscribers,
  registerUserLoggingSubscribers,
  registerActivityLoggingSubscribers,
} from "@repo/core";
import { sessionMiddleware, keycloakMiddleware, protectRole } from "./keycloak";
import { apiRouter } from "./routes/api.routes";

export const app = express();

// Keycloak session + middleware
app.use(sessionMiddleware);
app.use(keycloakMiddleware);

app.use(cors());
app.use(express.json());
app.use(logger);

// Protected routes
app.use("/api", apiRouter);

// Example role-protected route
app.get("/admin-only", protectRole("taskflow-api:full-access"), (_req, res) => {
  res.json({ ok: true });
});

app.use(errorHandler);

registerProjectLoggingSubscribers();
registerTaskLoggingSubscribers();
registerUserLoggingSubscribers();
registerActivityLoggingSubscribers();
