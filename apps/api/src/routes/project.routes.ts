import { Router } from "express";
import { ProjectController } from "../controllers/project.controller";
import { validate } from "../infra/http/middlewares/validate-request.middleware";
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectParamsDto,
  ProjectOffsetPaginationDto,
  ProjectCursorPaginationDto,
  TCreateProjectDto,
  TUpdateProjectDto,
  TProjectParamsDto,
  TProjectOffsetPagination,
  TProjectCursorPagination,
} from "@repo/shared";
import {
  withBody,
  withParams,
  withParamsAndBody,
  withQuery,
} from "../utils/typed-route";

export const projectRouter: Router = Router();
const controller = new ProjectController();

// POST /projects
projectRouter.post(
  "/",
  validate({ body: CreateProjectDto }),
  withBody<TCreateProjectDto>((req, res, next) =>
    controller.create(req, res, next),
  ),
);

// GET /projects/cursor — cursor pagination
projectRouter.get(
  "/cursor",
  validate({ query: ProjectCursorPaginationDto }),
  withQuery<TProjectCursorPagination>((req, res, next) =>
    controller.findAllCursor(req, res, next),
  ),
);

// GET /projects — offset pagination
projectRouter.get(
  "/",
  validate({ query: ProjectOffsetPaginationDto }),
  withQuery<TProjectOffsetPagination>((req, res, next) =>
    controller.findAll(req, res, next),
  ),
);

// GET /projects/:id
projectRouter.get(
  "/:id",
  validate({ params: ProjectParamsDto }),
  withParams<TProjectParamsDto>((req, res, next) =>
    controller.findById(req, res, next),
  ),
);

// PATCH /projects/:id
projectRouter.patch(
  "/:id",
  validate({ params: ProjectParamsDto, body: UpdateProjectDto }),
  withParamsAndBody<TProjectParamsDto, TUpdateProjectDto>((req, res, next) =>
    controller.update(req, res, next),
  ),
);

// DELETE /projects/:id
projectRouter.delete(
  "/:id",
  validate({ params: ProjectParamsDto }),
  withParams<TProjectParamsDto>((req, res, next) =>
    controller.delete(req, res, next),
  ),
);
