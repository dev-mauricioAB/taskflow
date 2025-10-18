import { Request, Response } from "express";
import { CreateTaskUseCase } from "@repo/core/src/use-cases/create-task.usecase";
import { TaskRepository } from "@repo/infra/src/repositories/task.repository";

export class TaskController {
  private taskRepo = new TaskRepository();
  private createTaskUseCase = new CreateTaskUseCase();

  async create(req: Request, res: Response) {
    try {
      const taskData = req.body;
      const task = this.createTaskUseCase.execute(taskData);
      await this.taskRepo.create(task);
      res.status(201).json(task);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }

  async findAll(_req: Request, res: Response) {
    try {
      const tasks = await this.taskRepo.findAll();
      res.status(200).json(tasks);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
}
