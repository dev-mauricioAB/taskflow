import { Request, Response } from "express";
import {
  CreateActivityUseCase,
  DeleteActivityUseCase,
  UpdateActivityUseCase,
} from "@repo/core";
import { ActivityRepository, eventBusPublisher } from "@repo/infra";
import {
  DeleteQuery,
  TActivityParamsDto,
  TCreateActivityDto,
  TUpdateActivityDto,
} from "@repo/shared";

export class ActivityController {
  private repo = new ActivityRepository();
  private createUC = new CreateActivityUseCase(this.repo, eventBusPublisher);
  private updateUC = new UpdateActivityUseCase(this.repo, eventBusPublisher);
  private deleteUC = new DeleteActivityUseCase(this.repo, eventBusPublisher);

  // POST /activities
  async create(req: Request<{}, {}, TCreateActivityDto>, res: Response) {
    const data = req.body; // { taskId, actorId, type, message? }
    const activity = await this.createUC.execute(data);
    res.status(201).json(activity);
  }

  // GET /task/:id
  async findActivityByTaskId(
    req: Request<TActivityParamsDto, {}>,
    res: Response,
  ) {
    const { id } = req.params;
    const items = await this.repo.findActivityByTaskId(id);
    res.status(200).json(items);
  }

  // PATCH /activities/:id
  async update(
    req: Request<TActivityParamsDto, {}, TUpdateActivityDto>,
    res: Response,
  ) {
    const result = await this.updateUC.execute(req.params.id, req.body);
    res.status(200).json(result);
  }

  // DELETE /activities/:id?hard=true
  async delete(
    req: Request<TActivityParamsDto, {}, {}, DeleteQuery>,
    res: Response,
  ) {
    // const hard = req.query.hard === "true";
    await this.deleteUC.execute({ activityId: req.params.id, hard: true });
    res.sendStatus(204); // Idempotent delete response. [web:230]
  }
}
