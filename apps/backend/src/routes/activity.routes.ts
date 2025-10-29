// apps/backend/src/routes/activity.routes.ts
import { Router } from "express";
import { ActivityController } from "../controllers/activity.controller";

export const activityRoutes = Router();
const ctrl = new ActivityController();

activityRoutes.post("/", (req, res) => ctrl.create(req, res));
activityRoutes.get("/task/:taskId", (req, res) => ctrl.findByTask(req, res));
