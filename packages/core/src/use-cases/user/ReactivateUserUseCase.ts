import {
  DomainError,
  IIdentityProviderAdmin,
  IUserRepository,
} from "@repo/infra";
import { User } from "@repo/shared";

export class ReactivateUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly identityProvider: IIdentityProviderAdmin,
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
        await this.identityProvider.enableUser(reactivated.keycloakUserId);
      } catch (idpError) {
        console.error(`Identity provider enable failed for user ${user.id}:`, idpError);
        // Best effort: log but succeed domain reactivation
      }
    }

    return reactivated;
  }
}
