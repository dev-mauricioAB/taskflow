import { NextFunction, Request, Response } from "express";
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  ReactivateUserUseCase,
} from "@repo/core";
import { DomainError, eventBusPublisher, UserRepository } from "@repo/infra";
import {
  TUpdateUserDto,
  TUserParamsDto,
  TCreateUserDto,
  TUserListOffsetQuery,
  TUserListCursorQuery,
} from "@repo/shared";

export class UserController {
  private userRepo = new UserRepository();
  private createUserUseCase = new CreateUserUseCase(
    this.userRepo,
    eventBusPublisher,
  );
  private deleteUserUseCase = new DeleteUserUseCase(
    this.userRepo,
    eventBusPublisher,
  );
  private reactivateUserUseCase = new ReactivateUserUseCase(this.userRepo);

  // POST /users
  async create(
    req: Request<{}, {}, TCreateUserDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const user = await this.createUserUseCase.execute(req.body);
      return res.status(201).json(user);
    } catch (err) {
      return next(err);
    }
  }

  // GET /users
  async findAll(
    req: Request<{}, {}, {}, TUserListOffsetQuery>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { q, limit, offset, includeDeleted, sortBy, sortDir } = req.query;
      const result = await this.userRepo.findAll({
        q,
        limit,
        offset,
        includeDeleted,
        sortBy,
        sortDir,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // GET /users/cursor
  // Cursor pagination
  async findAllCursor(
    req: Request<{}, {}, {}, TUserListCursorQuery>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { q, take, cursor, includeDeleted, sortBy, sortDir } =
        req.query;

      const result = await this.userRepo.findAllCursor({
        q,
        take,
        cursor,
        includeDeleted,
        sortBy,
        sortDir,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // DELETE /users/:id?hard=true
  async delete(
    req: Request<TUserParamsDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      // Decide soft vs hard delete policy; example uses hard: true as earlier
      await this.deleteUserUseCase.execute({ userId: id, hard: true });
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  // PATCH /users/:id
  async update(
    req: Request<TUserParamsDto, {}, TUpdateUserDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      const { email, name } = req.body;

      // Repository should ignore undefined fields and trim where appropriate
      const { changed } = await this.userRepo.update(id, { email, name });

      return res.status(200).json({ id, changed });
    } catch (err) {
      return next(err);
    }
  }

  // GET /users/:id
  async findById(
    req: Request<TUserParamsDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;

      const user = await this.userRepo.findById(id);
      if (!user) {
        return next(new DomainError({ code: "NOT_FOUND", message: "User not found" }));
      }

      return res.status(200).json(user);
    } catch (err) {
      return next(err);
    }
  }

  // POST /users/reactivate
  async reactivate(
    req: Request<{}, {}, TUpdateUserDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { email } = req.body;

      if (!email) {
        return next(new DomainError({ code: "VALIDATION_FAILED", message: "Email is required for reactivation" }));
      }

      // Note: in a real app, verify email ownership (OTP/magic link) before reactivation.
      const user = await this.reactivateUserUseCase.execute(email);

      return res.status(200).json(user);
    } catch (err) {
      return next(err);
    }
  }
}
