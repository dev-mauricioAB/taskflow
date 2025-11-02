// apps/backend/src/routes/activity.routes.ts
import { Router } from "express";
import { ActivityController } from "../controllers/activity.controller";

export const activityRoutes = Router();
const controller = new ActivityController();

activityRoutes.post("/", (req, res) => controller.create(req, res));
activityRoutes.get("/task/:id", (req, res) =>
  controller.findActivityByTaskId(req, res),
);
activityRoutes.patch("/:id", (req, res) => controller.update(req, res));
activityRoutes.delete("/:id", (req, res) => controller.delete(req, res));
