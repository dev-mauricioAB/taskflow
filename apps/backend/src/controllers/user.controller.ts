import { Request, Response } from "express";
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  ReactivateUserUseCase,
} from "@repo/core";
import { eventBusPublisher, UserRepository } from "@repo/infra";
import { TUpdateUserDto, TUserParamsDto, DeleteQuery } from "@repo/shared";

export class UserController {
  private userRepo = new UserRepository();
  private createUserUseCase = new CreateUserUseCase(
    this.userRepo,
    eventBusPublisher,
  );
  private deleteUserUseCase = new DeleteUserUseCase(
    this.userRepo,
    eventBusPublisher,
  );
  private reactivateUserUseCase = new ReactivateUserUseCase(this.userRepo);

  // POST /users
  async create(req: Request, res: Response) {
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const user = await this.createUserUseCase.execute(req.body);
    res.status(201).json(user);
  }

  // GET /users
  async findAll(_req: Request, res: Response) {
    const users = await this.userRepo.findAll();
    res.status(200).json(users);
  }

  // DELETE /users/:id?hard=true
  async delete(
    req: Request<TUserParamsDto, {}, {}, DeleteQuery>,
    res: Response,
  ) {
    const id = req.params.id;
    // const hard = req.query.hard === "true";
    await this.deleteUserUseCase.execute({ userId: id, hard: true });
    res.status(204).send();
  }

  // PATCH /users/:id
  async update(
    req: Request<TUserParamsDto, {}, TUpdateUserDto>,
    res: Response,
  ) {
    const id = req.params.id;
    const { email, name } = req.body ?? {};
    if (
      typeof email !== "string" ||
      email.trim() === "" ||
      typeof name !== "string" ||
      name.trim() === ""
    ) {
      return res.status(400).json({ error: "Email and Name are required" });
    }
    const { changed } = await this.userRepo.update(id, {
      email,
      name,
    });

    res.status(200).json({ id, changed });
  }

  // GET /users/:id
  async findById(req: Request, res: Response) {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: "Missing user id" });
      return;
    }

    const user = await this.userRepo.findById(id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json(user);
  }

  // POST /users / reactivate
  async reactivate(req: Request, res: Response) {
    const { email } = req.body ?? {};
    if (typeof email !== "string" || email.trim() === "") {
      return res.status(400).json({ error: "Email is required" }); // validation error [web:62]
    }

    // Important: in a real app, verify email ownership (OTP/magic link) before reactivation.

    const user = await this.reactivateUserUseCase.execute(email);
    // If the account was inactive, it is now active; if already active, return it as-is
    return res.status(200).json(user);
  }
}
