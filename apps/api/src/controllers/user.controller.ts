import { NextFunction, Request, Response } from "express";
import {
  CreateUserUseCase,
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
    req: Request<{}, {}, TUpdateUserDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { email } = req.body;

      if (!email) {
        return next(
          new DomainError({
            code: "VALIDATION_FAILED",
            message: "Email is required for reactivation",
          }),
        );
      }

      await authKeycloakAdmin();
      // Note: in a real app, verify email ownership (OTP/magic link) before reactivation.
      const user = await this.reactivateUserUC.execute(email);

      return res.status(200).json(user);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Full user signup with Keycloak credentials
   * WHY SEPARATE CREATION IN TWO STEPS? (Keycloak → Local User)
   *
   * 1) Keycloak FIRST: Identity Provider owns AUTHORITY over identity/credentials
   *    - Password hashing, credential policies, brute-force protection
   *    - Ensures user exists in IAM before app knows about them
   *
   * 2) Local User SECOND: App owns business metadata/profile
   *    - Links via opaque `keycloakUserId` (loose coupling)
   *    - Domain validation (email uniqueness) happens here
   *
   * 3) Benefits:
   *    - Keycloak can be swapped (Auth0, etc.) with minimal app changes
   *    - Local DB stays clean (no passwords, no auth logic)
   *    - Atomic: if Keycloak fails → no local user created
   *    - Controllers orchestrate, use cases validate domain rules
   */
  async createWithKeycloak(
    req: Request<{}, {}, TCreateKeycloakUserDto>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { name, email, password } = req.body;
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();

      // STEP 1: CREATE IDENTITY in Keycloak (credentials + basic profile)
      await authKeycloakAdmin();

      const kcUser = await kcAdmin.users.create({
        username: trimmedEmail,
        email: trimmedEmail,
        firstName: trimmedName,
        enabled: true,
        credentials: [
          {
            type: "password",
            value: password,
            temporary: false, // user can login immediately
          },
        ],
      });

      const keycloakUserId = kcUser.id;
      if (!keycloakUserId) {
        throw new Error("Keycloak did not return user ID");
      }

      // STEP 2: CREATE BUSINESS USER in app DB (domain validation + events)
      // Pass keycloakUserId to link the two identities
      const appUser = await this.createUserUC.execute({
        name: trimmedName,
        email: trimmedEmail,
        keycloakUserId, // ← Links the two systems
      });

      // STEP 3: Return fully linked user
      // Frontend gets appUser with keycloakUserId populated
      return res.status(201).json(appUser);
    } catch (err) {
      // If Keycloak fails → no local user created (atomicity)
      // If local creation fails → Keycloak user exists (can cleanup later if needed)
      return next(err);
    }
  }
}
