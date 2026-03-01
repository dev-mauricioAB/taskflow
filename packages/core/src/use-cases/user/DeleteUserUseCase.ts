import {
  DomainError,
  IEventPublisher,
  IIdentityProviderAdmin,
  IUserRepository,
} from "@repo/infra";
import { USER_DELETED } from "@repo/shared";

type DeleteInput = { userId: string; hard?: boolean };

export class DeleteUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly events: IEventPublisher,
    private readonly identityProvider: IIdentityProviderAdmin,
  ) {}

  async execute({ userId, hard = false }: DeleteInput): Promise<void> {
    const now = new Date();
    const nowIso = now.toISOString();

    const affected = hard
      ? await this.users.hardDelete(userId)
      : await this.users.softDelete(userId, now);

    if (!affected) {
      throw new DomainError({ code: "NOT_FOUND", message: "User not found" });
    }

    try {
      // Fetch user to get keycloakUserId (add findById to repo if needed)
      const user = await this.users.findById(userId);
      if (user?.keycloakUserId) {
        await this.identityProvider.disableUser(user.keycloakUserId);
      }
    } catch (idpError) {
      console.error(
        `Identity provider disable failed for user ${userId}:`,
        idpError,
      );
      // Best effort: log but don't fail domain delete
    }

    this.events.publish(USER_DELETED, {
      userId,
      deletedAt: nowIso,
      hard,
    });
  }
}
