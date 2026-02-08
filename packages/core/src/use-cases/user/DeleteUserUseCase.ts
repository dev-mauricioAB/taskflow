import { DomainError, IEventPublisher, IUserRepository } from "@repo/infra";
import { USER_DELETED } from "@repo/shared";
import KcAdminClient from "@keycloak/keycloak-admin-client";

type DeleteInput = { userId: string; hard?: boolean };

export class DeleteUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly events: IEventPublisher,
    private readonly kcAdmin: KcAdminClient,
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
        await this.kcAdmin.users.update(
          { id: user.keycloakUserId },
          { enabled: false }, // Disable preserves audit/sessions
        );
      }
    } catch (kcError) {
      console.error(`Keycloak disable failed for user ${userId}:`, kcError);
      // Best effort: log but don't fail domain delete
    }

    this.events.publish(USER_DELETED, {
      userId,
      deletedAt: nowIso,
      hard,
    });
  }
}
