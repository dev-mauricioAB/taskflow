import { DomainError, IEventPublisher, IUserRepository } from "@repo/infra";
import { USER_DELETED } from "@repo/shared";

type DeleteInput = { userId: string; hard?: boolean };

export class DeleteUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly events: IEventPublisher,
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

    this.events.publish(USER_DELETED, {
      userId,
      deletedAt: nowIso,
      hard,
    });
  }
}
