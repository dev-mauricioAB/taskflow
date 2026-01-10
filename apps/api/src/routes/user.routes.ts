import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { validate } from "../infra/http/middlewares/validate-request.middleware";
import {
  CreateUserDto,
  TCreateUserDto,
  TUpdateUserDto,
  TUserOffsetPagination,
  TUserCursorPagination,
  TUserParamsDto,
  UpdateUserDto,
  UserCursorPaginationDto,
  UserOffsetPaginationDto,
  UserParamsDto,
} from "@repo/shared";
import {
  withParamsAndBody,
  withParams,
  withQuery,
  withBody,
} from "../utils/typed-route";

export const userRouter: Router = Router();
const controller = new UserController();

// Offset-based: GET /users?limit=20&offset=0&q=...
userRouter.get(
  "/",
  validate({ query: UserOffsetPaginationDto }),
  withQuery<TUserOffsetPagination>((req, res, next) =>
    controller.findAll(req, res, next),
  ),
);

// Cursor-based: GET /users/cursor?take=20&cursor=abc123&q=...
userRouter.get(
  "/cursor",
  validate({ query: UserCursorPaginationDto }),
  withQuery<TUserCursorPagination>((req, res, next) =>
    controller.findAllCursor(req, res, next),
  ),
);

// GET /users/:id
userRouter.get(
  "/:id",
  validate({ params: UserParamsDto }),
  withParams<TUserParamsDto>((req, res, next) =>
    controller.findById(req, res, next),
  ),
);

// POST /users
userRouter.post(
  "/",
  validate({ body: CreateUserDto }),
  withBody<TCreateUserDto>((req, res, next) =>
    controller.create(req, res, next),
  ),
);

// PATCH /users/:id (update) — validate params + body
userRouter.patch(
  "/:id",
  validate({ params: UserParamsDto, body: UpdateUserDto }),
  withParamsAndBody<TUserParamsDto, TUpdateUserDto>((req, res, next) =>
    controller.update(req, res, next),
  ),
);

// DELETE /users/:id
userRouter.delete(
  "/:id",
  validate({ params: UserParamsDto }),
  withParams<TUserParamsDto>((req, res, next) =>
    controller.delete(req, res, next),
  ),
);

// POST /users/reactivate
userRouter.post(
  "/:id/reactivate",
  validate({ params: UserParamsDto }),
  withParams<TUserParamsDto>((req, res, next) =>
    controller.reactivate(req, res, next),
  ),
);
