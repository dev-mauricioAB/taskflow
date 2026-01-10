import { Router } from "express";
import { ActivityController } from "../controllers/activity.controller";
import { validate } from "../infra/http/middlewares/validate-request.middleware";
import {
  CreateActivityDto,
  UpdateActivityDto,
  ActivityParamsDto,
  ActivityQueryDto,
  TCreateActivityDto,
  TUpdateActivityDto,
  TActivityParamsDto,
  TActivityQueryDto,
} from "@repo/shared";
import {
  withBody,
  withParams,
  withParamsAndBody,
  withQuery,
} from "../utils/typed-route";

export const activityRoutes: Router = Router();
const controller = new ActivityController();

// POST /activities
activityRoutes.post(
  "/",
  validate({ body: CreateActivityDto }),
  withBody<TCreateActivityDto>((req, res, next) =>
    controller.create(req, res, next),
  ),
);

// GET /activities/task/:id — by taskId as route param
activityRoutes.get(
  "/task/:id",
  validate({ params: ActivityParamsDto }),
  withParams<TActivityParamsDto>((req, res, next) =>
    controller.findByTaskId(req, res, next),
  ),
);

// Optional: GET /activities — filter by query (taskId/actorId/type)
activityRoutes.get(
  "/",
  validate({ query: ActivityQueryDto }),
  withQuery<TActivityQueryDto>((req, res, next) =>
    controller.findMany(req, res, next),
  ),
);

// PATCH /activities/:id
activityRoutes.patch(
  "/:id",
  validate({ params: ActivityParamsDto, body: UpdateActivityDto }),
  withParamsAndBody<TActivityParamsDto, TUpdateActivityDto>((req, res, next) =>
    controller.update(req, res, next),
  ),
);

// DELETE /activities/:id
activityRoutes.delete(
  "/:id",
  validate({ params: ActivityParamsDto }),
  withParams<TActivityParamsDto>((req, res, next) =>
    controller.delete(req, res, next),
  ),
);
