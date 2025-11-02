import { Router } from "express";
import { TaskController } from "../controllers/task.controller";

export const taskRouter: Router = Router();
const controller = new TaskController();

taskRouter.post("/", (req, res) => controller.create(req, res));
taskRouter.get("/", (req, res) => controller.findAll(req, res));
taskRouter.get("/:id", (req, res) => controller.findById(req, res));
taskRouter.delete("/:id", (req, res) => controller.delete(req, res));
taskRouter.patch("/:id", (req, res) => controller.update(req, res));
taskRouter.post("/:id/complete", (req, res) => controller.complete(req, res));
