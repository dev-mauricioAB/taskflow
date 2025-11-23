// apps/backend/src/controllers/activity.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  CreateActivityUseCase,
  DeleteActivityUseCase,
  FindActivitiesUseCase,
  GetActivitiesByTaskIdUseCase,
  UpdateActivityUseCase,
} from "@repo/core";
import { ActivityRepository, eventBusPublisher } from "@repo/infra";
import {
  TActivityParamsDto,
  TCreateActivityDto,
  TUpdateActivityDto,
  TActivityQueryDto,
} from "@repo/shared";

export class ActivityController {
  private repo = new ActivityRepository();
  // Commands (publish events in use cases)
  private createUC = new CreateActivityUseCase(this.repo, eventBusPublisher);
  private updateUC = new UpdateActivityUseCase(this.repo, eventBusPublisher);
  private deleteUC = new DeleteActivityUseCase(this.repo, eventBusPublisher);

  // Queries (no events)
  private getByTaskIdUC = new GetActivitiesByTaskIdUseCase(this.repo);
  private findActivitiesUC = new FindActivitiesUseCase(this.repo);

  // POST /activities
  async create(
    req: Request<{}, {}, TCreateActivityDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const data = req.body; // { taskId, actorId, type, message? }
      const activity = await this.createUC.execute(data);
      return res.status(201).json(activity);
    } catch (err) {
      return next(err);
    }
  }

  // GET /activities/task/:id
  async findByTaskId(
    req: Request<TActivityParamsDto, {}>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const items = await this.getByTaskIdUC.execute({ id: req.params.id });
      return res.status(200).json(items);
    } catch (err) {
      return next(err);
    }
  }

  // GET /activities?taskId=&actorId=&type=
  async findMany(
    req: Request<{}, {}, {}, TActivityQueryDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const items = await this.findActivitiesUC.execute(req.query);
      return res.status(200).json(items);
    } catch (err) {
      return next(err);
    }
  }

  // PATCH /activities/:id
  async update(
    req: Request<TActivityParamsDto, {}, TUpdateActivityDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const updated = await this.updateUC.execute(req.params.id, req.body);
      return res.status(200).json(updated);
    } catch (err) {
      return next(err);
    }
  }

  // DELETE /activities/:id
  async delete(
    req: Request<TActivityParamsDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await this.deleteUC.execute({ activityId: req.params.id, hard: true });
      return res.sendStatus(204);
    } catch (err) {
      return next(err);
    }
  }
}
