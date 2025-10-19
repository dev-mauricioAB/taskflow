import { Request, Response } from "express";
import { CreateUserUseCase } from "@repo/core";
import { UserRepository } from "@repo/infra";

export class UserController {
  private userRepo = new UserRepository();
  private createUserUseCase = new CreateUserUseCase();

  async create(req: Request, res: Response) {
    try {
      const userData = req.body;
      const user = this.createUserUseCase.execute(userData);
      await this.userRepo.create(user);
      res.status(201).json(user);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }

  async findAll(_req: Request, res: Response) {
    try {
      const users = await this.userRepo.findAll();
      res.status(200).json(users);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
}
