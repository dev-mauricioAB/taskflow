import { Request, Response } from "express";
import {
  CreateProjectUseCase,
  DeleteProjectUseCase,
  UpdateProjectUseCase,
} from "@repo/core";
import { eventBusPublisher, ProjectRepository } from "@repo/infra";
import {
  DeleteQuery,
  TCreateProjectDto,
  TProjectParamsDto,
  TProjectQueryDto,
  TUpdateProjectDto,
} from "@repo/shared";

export class ProjectController {
  private repo = new ProjectRepository();
  private createUC = new CreateProjectUseCase(this.repo, eventBusPublisher);
  private updateUC = new UpdateProjectUseCase(this.repo, eventBusPublisher);
  private deleteUC = new DeleteProjectUseCase(this.repo, eventBusPublisher);

  // POST /projects
  async create(req: Request<{}, {}, TCreateProjectDto>, res: Response) {
    const dto = req.body;
    const project = await this.createUC.execute({
      ownerId: dto.ownerId,
      name: dto.name.trim(),
      description: dto.description?.trim(),
    });
    res.status(201).json(project);
  }

  // GET /projects
  async findAll(_req: Request<{}, {}, {}, TProjectQueryDto>, res: Response) {
    const projects = await this.repo.findAll();
    res.status(200).json(projects);
  }

  // GET /projects/:id
  async findById(req: Request<TProjectParamsDto>, res: Response) {
    const project = await this.repo.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Not found" });
    res.status(200).json(project);
  }

  // PATCH /projects/:id
  async update(
    req: Request<TProjectParamsDto, {}, TUpdateProjectDto>,
    res: Response,
  ) {
    const patch: Record<string, unknown> = {};
    if (req.body.name) patch.name = req.body.name.trim();
    if (req.body.description) patch.description = req.body.description?.trim();

    const result = await this.updateUC.execute({
      projectId: req.params.id,
      patch,
    });
    res.status(200).json(result);
  }

  // DELETE /projects/:id?hard=true
  async delete(
    req: Request<TProjectParamsDto, {}, {}, DeleteQuery>,
    res: Response,
  ) {
    // const hard = req.query.hard === "true";
    await this.deleteUC.execute({ projectId: req.params.id, hard: true });
    res.sendStatus(204); // No Content for successful deletion with no body
  }
}
