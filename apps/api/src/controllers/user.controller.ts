import { NextFunction, Request, Response } from "express";
import {
  CreateUserUseCase,
  CreateUserWithKeycloakUseCase,
  DeleteUserUseCase,
  GetUserByIdUseCase,
  GetUsersCursorUseCase,
  GetUsersOffsetUseCase,
  ReactivateUserUseCase,
  UpdateUserUseCase,
} from "@repo/core";
import {
  DomainError,
  eventBusPublisher,
  KeycloakIdentityProviderAdmin,
  UserRepository,
} from "@repo/infra";
import {
  TUpdateUserDto,
  TUserParamsDto,
  TCreateUserDto,
  TUserCursorPagination,
  TUserOffsetPagination,
  TCreateKeycloakUserDto,
  TReactivateUserDto,
} from "@repo/shared";
import { authKeycloakAdmin, kcAdmin } from "../config/keycloak-admin";

export class UserController {
  private userRepo = new UserRepository();
  private identityProvider = new KeycloakIdentityProviderAdmin(kcAdmin);

  // Commands (publish events)
  private createUserUC = new CreateUserUseCase(
    this.userRepo,
    eventBusPublisher,
  );
  private createUserWithKeycloakUC = new CreateUserWithKeycloakUseCase(
    this.createUserUC,
    this.identityProvider,
  );
  private deleteUserUC = new DeleteUserUseCase(
    this.userRepo,
    eventBusPublisher,
    this.identityProvider,
  );
  private updateUserUC = new UpdateUserUseCase(
    this.userRepo,
    eventBusPublisher,
    this.identityProvider,
  );

  // Queries (no events)
  private reactivateUserUC = new ReactivateUserUseCase(
    this.userRepo,
    this.identityProvider,
  );
  private getUsersOffsetUC = new GetUsersOffsetUseCase(this.userRepo);
  private getUsersCursorUC = new GetUsersCursorUseCase(this.userRepo);
  private getUserByIdUC = new GetUserByIdUseCase(this.userRepo);

  // POST /users
  async create(
    req: Request<{}, {}, TCreateUserDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const user = await this.createUserUC.execute(req.body);
      return res.status(201).json(user);
    } catch (err) {
      return next(err);
    }
  }

  // GET /users (offset)
  async findAll(
    req: Request<{}, {}, {}, TUserOffsetPagination>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { q, limit, offset, includeDeleted, sortBy, sortDir } = req.query;
      const result = await this.getUsersOffsetUC.execute({
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
  async findAllCursor(
    req: Request<{}, {}, {}, TUserCursorPagination>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { q, take, cursor, includeDeleted, sortBy, sortDir } = req.query;
      const result = await this.getUsersCursorUC.execute({
        q,
        take,
        cursor, // union string | { id } accepted by UC
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

      await authKeycloakAdmin();
      await this.deleteUserUC.execute({ userId: id, hard: true });

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

      await authKeycloakAdmin();
      const result = await this.updateUserUC.execute({
        userId: id,
        patch: { email, name },
      });

      return res.status(200).json(result); // { success: true }
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
      const user = await this.getUserByIdUC.execute({ id });
      if (!user) {
        return next(
          new DomainError({ code: "NOT_FOUND", message: "User not found" }),
        );
      }
      return res.status(200).json(user);
    } catch (err) {
      return next(err);
    }
  }

  // POST /users/reactivate
  async reactivate(
    req: Request<{}, {}, TReactivateUserDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { email } = req.body;

      await authKeycloakAdmin();
      // Note: in a real app, verify email ownership (OTP/magic link) before reactivation.
      const user = await this.reactivateUserUC.execute(email);

      return res.status(200).json(user);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Signup with identity provider credentials.
   * Controller only ensures IdP admin auth and delegates to use case.
   */
  async createWithKeycloak(
    req: Request<{}, {}, TCreateKeycloakUserDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      await authKeycloakAdmin();
      const user = await this.createUserWithKeycloakUC.execute(req.body);
      return res.status(201).json(user);
    } catch (err) {
      return next(err);
    }
  }
}
