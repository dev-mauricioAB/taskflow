import { Router } from "express";
import { UserController } from "../controllers/user.controller";

export const userRouter: Router = Router();
const controller = new UserController();

userRouter.post("/", (req, res) => controller.create(req, res));
userRouter.get("/", (req, res) => controller.findAll(req, res));
