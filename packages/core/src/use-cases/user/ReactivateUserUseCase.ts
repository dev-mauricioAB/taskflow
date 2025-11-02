import { DomainError, IUserRepository } from "@repo/infra";
import { User } from "@repo/shared";

export class ReactivateUserUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(email: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    const user = await this.users.findByEmail(normalized);
    if (!user)
      throw new DomainError({
        code: "NOT_FOUND",
        message: "No account found for this email.",
        details: { email: normalized },
      });
    return this.users.reactivate(user.id);
  }
}
