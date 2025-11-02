import {
  DomainError,
  IEventPublisher,
  IUserRepository,
  NewEntity,
} from "@repo/infra";
import { User, USER_UPDATED, UserUpdatedPayload } from "@repo/shared";

type Input = {
  userId: string;
  patch: NewEntity<Partial<User>>;
};

type Output = { success: boolean };

export class UpdateUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute({ userId, patch }: Input): Promise<Output> {
    const { changed } = await this.users.update(userId, patch);

    if (!changed) {
      throw new DomainError({
        code: "NOT_FOUND",
        message: `User '${userId}' not found`,
      });
    }

    const payload: UserUpdatedPayload = {
      userId,
      changed,
      updatedAt: new Date().toISOString(),
    };
    this.events.publish<UserUpdatedPayload>(USER_UPDATED, payload);

    return { success: true };
  }
}
