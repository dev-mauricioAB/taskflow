import { DomainError, IUserRepository } from "@repo/infra";
import { User } from "@repo/shared";
import KcAdminClient from "@keycloak/keycloak-admin-client";

export class ReactivateUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly kcAdmin: KcAdminClient,
  ) {}

  async execute(email: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);

    if (!user) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: "No account found for this email.",
        details: { email: normalized },
      });
    }

    const reactivated = await this.users.reactivate(user.id);

    if (reactivated.keycloakUserId) {
      try {
        await this.kcAdmin.users.update(
          { id: reactivated.keycloakUserId },
          { enabled: true },
        );
      } catch (kcError) {
        console.error(`Keycloak enable failed for user ${user.id}:`, kcError);
        // Best effort: log but succeed domain reactivation
      }
    }

    return reactivated;
  }
}
