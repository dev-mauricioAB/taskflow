import {
  IEventPublisher,
  IUserRepository,
  NewEntity,
  DomainError,
} from "@repo/infra";
import { USER_CREATED, UserCreatedPayload, User } from "@repo/shared";
import { TCreateUserDto } from "@repo/shared";

export class CreateUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute(input: TCreateUserDto): Promise<User> {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();

    // 1) Check if any user exists by email (including inactive/soft-deleted)
    const existing = await this.users.findByEmail(email);

    if (existing) {
      if (existing.deletedAt) {
        // Explicit inactive handling: guide caller to reactivation flow
        throw new DomainError({
          code: "USER_INACTIVE",
          message:
            "An account with this email exists but is inactive. Reactivate the account to proceed.",
          details: {
            email: existing.email,
          },
        });
      }
      // Active account already exists
      throw new DomainError({
        code: "EMAIL_IN_USE",
        message: "An active account with this email already exists.",
        details: { email },
      });
    }

    // 2) Create as new when no record exists
    const newUser: NewEntity<User> = { name, email };
    const user = await this.users.create(newUser);

    const payload: UserCreatedPayload = {
      userId: user.id,
      email: user.email,
      username: user.name,
      createdAt: user.createdAt.toISOString(),
    };
    this.events.publish<UserCreatedPayload>(USER_CREATED, payload);

    return user;
  }
}
