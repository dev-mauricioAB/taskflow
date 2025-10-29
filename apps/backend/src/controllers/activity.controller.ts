import { Request, Response } from "express";
import { CreateActivityUseCase } from "@repo/core";
import { ActivityRepository } from "@repo/infra";

export class ActivityController {
  private repo = new ActivityRepository();
  private createUC = new CreateActivityUseCase();

  async create(req: Request, res: Response) {
    try {
      const data = req.body; // { taskId, actorId, type, message? }
      const activity = this.createUC.execute(data);
      await this.repo.create(activity);
      res.status(201).json(activity);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }

  async findByTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const items = await this.repo.findByTask(taskId);
      res.status(200).json(items);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
}