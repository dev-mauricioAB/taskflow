import {
  DomainError,
  IEventPublisher,
  IIdentityProviderAdmin,
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
    private readonly identityProvider: IIdentityProviderAdmin,
  ) {}

  async execute({
    userId,
    patch,
  }: Input): Promise<{ changed: Record<string, unknown> }> {
    // 1) Normalize + validate (existing logic unchanged)
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
    const updated = (await this.users.update(
      userId,
      normalized,
    )) as TUpdateUserDto | null;

    if (!updated) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: `User '${userId}' not found`,
      });
    }

    // 4) Sync to identity provider if keycloakUserId was provided
    if (updated.keycloakUserId) {
      try {
        // Build identity provider update payload from relevant changes
        const idpUpdates: {
          firstName?: string;
          email?: string;
        } = {};
        if (normalized.name !== undefined) {
          idpUpdates.firstName = normalized.name as string;
        }
        if (normalized.email !== undefined) {
          idpUpdates.email = normalized.email as string;
        }

        if (Object.keys(idpUpdates).length > 0) {
          await this.identityProvider.updateUser(
            updated.keycloakUserId,
            idpUpdates,
          );
        }
      } catch (idpError) {
        console.error(`Identity provider sync failed for user ${userId}:`, idpError);
        // Best effort: log but don't fail local update
      }
    }

    // 5) Compute changed from intended ∩ projection keys (existing)
    const changed: Record<string, unknown> = {};
    for (const key of intended) {
      if (key in updated) {
        changed[key as string] = (updated as any)[key as string];
      }
    }

    // 6) Publish event with rich payload (existing)
    const payload: UserUpdatedPayload = {
      userId,
      changed,
      updatedAt: new Date().toISOString(),
    };
    this.events.publish<UserUpdatedPayload>(USER_UPDATED, payload);

    return { changed };
  }
}
