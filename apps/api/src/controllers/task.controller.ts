import { NextFunction, Request, Response } from "express";
import {
  CompleteTaskUseCase,
  CreateTaskUseCase,
  DeleteTaskUseCase,
  GetTaskByIdUseCase,
  GetTasksCursorUseCase,
  GetTasksOffsetUseCase,
  UpdateTaskUseCase,
} from "@repo/core";
import { eventBusPublisher, TaskRepository } from "@repo/infra";
import {
  CursorPage,
  CursorSortBy,
  DeleteQuery,
  Task,
  TCreateTaskDto,
  TTaskCursorPagination,
  TTaskOffsetPagination,
  TTaskParamsDto,
  TUpdateTaskDto,
} from "@repo/shared";

export class TaskController {
  private taskRepo = new TaskRepository();
  // Commands (events published inside use cases)
  private createTaskUC = new CreateTaskUseCase(
    this.taskRepo,
    eventBusPublisher,
  );
  private updateTaskUC = new UpdateTaskUseCase(
    this.taskRepo,
    eventBusPublisher,
  );
  private deleteTaskUC = new DeleteTaskUseCase(
    this.taskRepo,
    eventBusPublisher,
  );
  private completeTaskUC = new CompleteTaskUseCase(
    this.taskRepo,
    eventBusPublisher,
  );

  // Queries (no events)
  private getTasksOffsetUC = new GetTasksOffsetUseCase(this.taskRepo);
  private getTasksCursorUC = new GetTasksCursorUseCase(this.taskRepo);
  private getTaskByIdUC = new GetTaskByIdUseCase(this.taskRepo);

  // POST /tasks
  async create(
    req: Request<{}, {}, TCreateTaskDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const created = await this.createTaskUC.execute(req.body);
      return res.status(201).json(created);
    } catch (err) {
      return next(err);
    }
  }

  // / GET / tasks(offset)
  async findAll(
    req: Request<{}, {}, {}, TTaskOffsetPagination>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const page = await this.getTasksOffsetUC.execute(req.query);
      return res.status(200).json(page);
    } catch (err) {
      return next(err);
    }
  }

  // GET /tasks/cursor
  async findAllCursor(
    req: Request<{}, {}, {}, TTaskCursorPagination>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const page: CursorPage<Task, CursorSortBy> =
        await this.getTasksCursorUC.execute(req.query);
      return res.status(200).json(page);
    } catch (err) {
      return next(err);
    }
  }

  // GET /tasks/:id
  async findById(
    req: Request<TTaskParamsDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const task = await this.getTaskByIdUC.execute({ id: req.params.id });
      return res.status(200).json(task);
    } catch (err) {
      return next(err);
    }
  }

  // PATCH /tasks/:id
  async update(
    req: Request<TTaskParamsDto, {}, TUpdateTaskDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const dto = req.body;

      const result = await this.updateTaskUC.execute(id, {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        status: dto.status,
        userId: dto.userId,
        projectId: dto.projectId,
      });

      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  // POST /tasks/:id/complete
  async complete(
    req: Request<TTaskParamsDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const completedAt = new Date();
      await this.completeTaskUC.execute(req.params.id, completedAt);
      return res.status(200).json({ completedAt: completedAt.toISOString() });
    } catch (err) {
      return next(err);
    }
  }

  // DELETE /tasks/:id?hard=true
  async delete(
    req: Request<TTaskParamsDto, {}, DeleteQuery>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      // Adjust policy as needed; currently always hard delete for parity with users example
      await this.deleteTaskUC.execute({
        taskId: req.params.id,
        hard: true,
      });
      return res.sendStatus(204);
    } catch (err) {
      return next(err);
    }
  }
}
