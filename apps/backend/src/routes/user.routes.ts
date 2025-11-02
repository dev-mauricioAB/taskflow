import { Router } from "express";
import { UserController } from "../controllers/user.controller";

export const userRouter: Router = Router();
const controller = new UserController();

userRouter.post("/", (req, res) => controller.create(req, res));
userRouter.get("/", (req, res) => controller.findAll(req, res));
userRouter.get("/:id", (req, res) => controller.findById(req, res));
userRouter.patch("/:id", (req, res) => controller.update(req, res));
userRouter.delete("/:id", (req, res) => controller.delete(req, res));
userRouter.post("/:id/reactivate", (req, res) =>
  controller.reactivate(req, res),
);
