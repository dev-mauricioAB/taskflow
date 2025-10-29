import { Router } from "express";
import { ProjectController } from "../controllers/project.controller";

export const projectRoutes = Router();
const ctrl = new ProjectController();

projectRoutes.post("/", (req, res) => ctrl.create(req, res));
projectRoutes.get("/", (req, res) => ctrl.findAll(req, res));

