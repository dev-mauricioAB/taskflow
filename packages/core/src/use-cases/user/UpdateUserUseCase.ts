import {
  DomainError,
  IEventPublisher,
  IUserRepository,
  NewEntity,
} from "@repo/infra";
import {
  TUpdateUserDto,
  User,
  USER_UPDATED,
  UserUpdatedPayload,
} from "@repo/shared";

type Input = {
  userId: string;
  patch: NewEntity<Partial<User>>;
};

export class UpdateUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute({
    userId,
    patch,
  }: Input): Promise<{ changed: Record<string, unknown> }> {
    // 1) Normalize + validate
    const normalized: Record<string, unknown> = { ...patch };
    if (typeof patch.email !== "undefined") {
      const email = patch.email?.trim();
      if (!email) {
        throw new DomainError({
          code: "VALIDATION_FAILED",
          message: "Email cannot be empty",
        });
      }
      normalized.email = email;
    }
    if (typeof patch.name !== "undefined") {
      const name = patch.name?.trim();
      if (!name) {
        throw new DomainError({
          code: "VALIDATION_FAILED",
          message: "Name cannot be empty",
        });
      }
      normalized.name = name;
    }

    // 2) Determine intended keys (ignore undefined)
    const intended = (
      Object.keys(normalized) as (keyof typeof normalized)[]
    ).filter((k) => normalized[k] !== undefined);

    if (intended.length === 0) {
      return { changed: {} };
    }

    // 3) Persist (pure persistence concern in repo)
    const updated: TUpdateUserDto | null = await this.users.update(
      userId,
      normalized,
    );

    if (!updated) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: `User '${userId}' not found`,
      });
    }

    // 4) Compute changed from intended ∩ projection keys
    const changed: Record<string, unknown> = {};
    for (const key of intended) {
      if (key in updated) {
        changed[key as string] = (updated as any)[key as string];
      }
    }

    // 5) Publish event with rich payload
    const payload: UserUpdatedPayload = {
      userId,
      changed,
      updatedAt: new Date().toISOString(),
      // updatedAt: updated.updatedAt.toISOString(),
    };
    this.events.publish<UserUpdatedPayload>(USER_UPDATED, payload);

    return { changed };
  }
}
