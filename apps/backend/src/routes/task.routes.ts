import { Router } from "express";
import { TaskController } from "../controllers/task.controller";

export const taskRouter: Router = Router();
const controller = new TaskController();

taskRouter.post("/", (req, res) => controller.create(req, res));
taskRouter.get("/", (req, res) => controller.findAll(req, res));
