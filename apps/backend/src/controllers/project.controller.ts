import { Request, Response } from "express";
import { CreateProjectUseCase } from "@repo/core";
import { ProjectRepository } from "@repo/infra";

export class ProjectController {
  private repo = new ProjectRepository();
  private createUC = new CreateProjectUseCase();

  async create(req: Request, res: Response) {
    try {
      const data = req.body; // { ownerId, name, description? }
      const project = this.createUC.execute(data);
      await this.repo.create(project);
      res.status(201).json(project);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }

  async findAll(_req: Request, res: Response) {
    try {
      const projects = await this.repo.findAll();
      res.status(200).json(projects);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
}