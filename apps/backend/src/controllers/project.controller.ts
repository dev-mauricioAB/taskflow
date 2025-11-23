import { Request, Response, NextFunction } from "express";
import {
  TCreateProjectDto,
  TUpdateProjectDto,
  TProjectParamsDto,
} from "@repo/shared";
import {
  TProjectOffsetPagination,
  TProjectCursorPagination,
} from "@repo/shared"; // from the added DTOs above
import {
  CreateProjectUseCase,
  UpdateProjectUseCase,
  DeleteProjectUseCase,
  GetProjectsOffsetUseCase,
  GetProjectsCursorUseCase,
  GetProjectByIdUseCase,
} from "@repo/core";
import { ProjectRepository, eventBusPublisher } from "@repo/infra";

export class ProjectController {
  private repo = new ProjectRepository();

  // Commands (publish events via eventBusPublisher)
  private createUC = new CreateProjectUseCase(this.repo, eventBusPublisher);
  private updateUC = new UpdateProjectUseCase(this.repo, eventBusPublisher);
  private deleteUC = new DeleteProjectUseCase(this.repo, eventBusPublisher);

  // Queries (no events)
  private getProjectsOffsetUC = new GetProjectsOffsetUseCase(this.repo);
  private getProjectsCursorUC = new GetProjectsCursorUseCase(this.repo);
  private getProjectByIdUC = new GetProjectByIdUseCase(this.repo);

  // POST /projects
  async create(
    req: Request<{}, {}, TCreateProjectDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const dto = req.body;
      const project = await this.createUC.execute({
        ownerId: dto.ownerId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
      });
      return res.status(201).json(project);
    } catch (err) {
      return next(err);
    }
  }

  // GET /projects (offset pagination)
  async findAll(
    req: Request<{}, {}, {}, TProjectOffsetPagination>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { q, ownerId, limit, offset, includeDeleted, sortBy, sortDir } =
        req.query;
      const result = await this.getProjectsOffsetUC.execute({
        q,
        ownerId,
        limit,
        offset,
        includeDeleted,
        sortBy,
        sortDir,
      });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // GET /projects (cursor pagination)
  async findAllCursor(
    req: Request<{}, {}, {}, TProjectCursorPagination>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { q, ownerId, take, cursor, includeDeleted, sortBy, sortDir } =
        req.query;

      // Pass the union cursor as-is; use case normalizes string | { id }
      const result = await this.getProjectsCursorUC.execute({
        q,
        ownerId,
        take,
        cursor,
        includeDeleted,
        sortBy,
        sortDir,
      });

      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // GET /projects/:id
  async findById(
    req: Request<TProjectParamsDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const project = await this.getProjectByIdUC.execute({
        id: req.params.id,
      });
      if (!project) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(project);
    } catch (err) {
      return next(err);
    }
  }

  // PATCH /projects/:id
  async update(
    req: Request<TProjectParamsDto, {}, TUpdateProjectDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const patch: Record<string, unknown> = {};
      if (typeof req.body.name !== "undefined")
        patch.name = req.body.name.trim();
      if (typeof req.body.description !== "undefined")
        patch.description = req.body.description?.trim();

      const result = await this.updateUC.execute({
        projectId: req.params.id,
        patch,
      });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // DELETE /projects/:id
  async delete(
    req: Request<TProjectParamsDto, {}, {}, { hard?: string }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const hard = req.query.hard === "true";
      await this.deleteUC.execute({ projectId: req.params.id, hard });
      return res.sendStatus(204);
    } catch (err) {
      return next(err);
    }
  }
}
