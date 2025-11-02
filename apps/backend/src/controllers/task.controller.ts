import { Request, Response } from "express";
import {
  CompleteTaskUseCase,
  CreateTaskUseCase,
  DeleteTaskUseCase,
  UpdateTaskUseCase,
} from "@repo/core";
import { eventBusPublisher, TaskRepository } from "@repo/infra";
import {
  DeleteQuery,
  TCreateTaskDto,
  TTaskParamsDto,
  TTaskQueryDto,
  TUpdateTaskDto,
} from "@repo/shared";

export class TaskController {
  private taskRepo = new TaskRepository();
  private createTaskUseCase = new CreateTaskUseCase(
    this.taskRepo,
    eventBusPublisher,
  );
  private updateTaskUseCase = new UpdateTaskUseCase(
    this.taskRepo,
    eventBusPublisher,
  );
  private deleteTaskUseCase = new DeleteTaskUseCase(
    this.taskRepo,
    eventBusPublisher,
  );
  private completeTaskUseCase = new CompleteTaskUseCase(
    this.taskRepo,
    eventBusPublisher,
  );

  // POST /tasks
  async create(req: Request<{}, {}, TCreateTaskDto>, res: Response) {
    const dto = req.body;
    const task = await this.createTaskUseCase.execute({
      title: dto.title.trim(),
      description: dto.description?.trim(),
      status: dto.status,
      userId: dto.userId,
      projectId: dto.projectId,
    });
    res.status(201).json(task);
  }

  // GET /tasks
  async findAll(_req: Request<{}, {}, {}, TTaskQueryDto>, res: Response) {
    const tasks = await this.taskRepo.findAll();
    res.status(200).json(tasks);
  }

  // GET /tasks/:id
  async findById(req: Request<TTaskParamsDto>, res: Response) {
    const task = await this.taskRepo.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Not found" });
    res.status(200).json(task);
  }

  // PATCH /tasks/:id
  async update(
    req: Request<TTaskParamsDto, {}, TUpdateTaskDto>,
    res: Response,
  ) {
    const { id } = req.params;
    const dto = req.body;
    const result = await this.updateTaskUseCase.execute(id, {
      title: dto.title?.trim(),
      description: dto.description?.trim(),
      status: dto.status,
      userId: dto.userId,
      projectId: dto.projectId,
    });
    res.status(200).json(result);
  }

  // POST /tasks/:id/complete
  async complete(req: Request<TTaskParamsDto>, res: Response) {
    const completedAt = new Date();
    await this.completeTaskUseCase.execute(req.params.id, completedAt);
    res.status(200).json({ completedAt: completedAt.toISOString() });
  }

  // DELETE /tasks/:id?hard=true
  async delete(req: Request<TTaskParamsDto, {}, DeleteQuery>, res: Response) {
    // const hard = req.query.hard === "true";
    await this.deleteTaskUseCase.execute({ taskId: req.params.id, hard: true });
    res.sendStatus(204); // 204 is preferred for successful delete without a response body
  }
}
