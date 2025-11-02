import { Router } from "express";
import { ProjectController } from "../controllers/project.controller";

export const projectRoutes = Router();
const controller = new ProjectController();

projectRoutes.post("/", (req, res) => controller.create(req, res));
projectRoutes.get("/", (req, res) => controller.findAll(req, res));
projectRoutes.get("/:id", (req, res) => controller.findById(req, res));
projectRoutes.patch("/:id", (req, res) => controller.update(req, res));
projectRoutes.delete("/:id", (req, res) => controller.delete(req, res));
