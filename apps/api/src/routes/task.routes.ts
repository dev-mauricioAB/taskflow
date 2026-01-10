import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import { validate } from "../infra/http/middlewares/validate-request.middleware";
import {
  CreateTaskDto,
  TaskCursorPaginationDto,
  TaskOffsetPaginationDto,
  TaskParamsDto,
  TCreateTaskDto,
  TTaskCursorPagination,
  TTaskOffsetPagination,
  TTaskParamsDto,
  TUpdateTaskDto,
  UpdateTaskDto,
} from "@repo/shared";
import {
  withBody,
  withParams,
  withParamsAndBody,
  withQuery,
} from "../utils/typed-route";

export const taskRouter: Router = Router();
const controller = new TaskController();

// POST /tasks
taskRouter.post(
  "/",
  validate({ body: CreateTaskDto }),
  withBody<TCreateTaskDto>((req, res, next) =>
    controller.create(req, res, next),
  ),
);

// GET /tasks/cursor
taskRouter.get(
  "/cursor",
  validate({ query: TaskCursorPaginationDto }),
  withQuery<TTaskCursorPagination>((req, res, next) =>
    controller.findAllCursor(req, res, next),
  ),
);

// GET /tasks — list tasks with offset pagination
taskRouter.get(
  "/",
  validate({ query: TaskOffsetPaginationDto }),
  withQuery<TTaskOffsetPagination>((req, res, next) =>
    controller.findAll(req, res, next),
  ),
);

// GET /tasks/:id — fetch a task by id
taskRouter.get(
  "/:id",
  validate({ params: TaskParamsDto }),
  withParams<TTaskParamsDto>((req, res, next) =>
    controller.findById(req, res, next),
  ),
);

// DELETE /tasks/:id — delete a task
taskRouter.delete(
  "/:id",
  validate({ params: TaskParamsDto }),
  withParams<TTaskParamsDto>((req, res, next) =>
    controller.delete(req, res, next),
  ),
);

// PATCH /tasks/:id — update a task
taskRouter.patch(
  "/:id",
  validate({ params: TaskParamsDto, body: UpdateTaskDto }),
  withParamsAndBody<TTaskParamsDto, TUpdateTaskDto>((req, res, next) =>
    controller.update(req, res, next),
  ),
);

// POST /tasks/:id/complete — mark task as completed
taskRouter.post(
  "/:id/complete",
  validate({ params: TaskParamsDto }),
  withParams<TTaskParamsDto>((req, res, next) =>
    controller.complete(req, res, next),
  ),
);
