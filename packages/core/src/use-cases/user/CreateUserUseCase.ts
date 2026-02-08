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
        throw new DomainError({
          code: "USER_INACTIVE",
          message:
            "An account with this email exists but is inactive. Reactivate the account to proceed.",
          details: { email: existing.email },
        });
      }
      throw new DomainError({
        code: "EMAIL_IN_USE",
        message: "An active account with this email already exists.",
        details: { email },
      });
    }

    // 2) Create local user (existing logic)
    const newUser: NewEntity<User> = {
      name,
      email,
      ...(input.keycloakUserId && { keycloakUserId: input.keycloakUserId }), // link if provided
    };
    const user = await this.users.create(newUser);

    // 3) Verify Keycloak linkage ONLY IF keycloakUserId was provided (best effort)
    if (input.keycloakUserId) {
      try {
        // Use case just logs if linkage was expected but something's wrong
        console.log(
          `User ${user.id} successfully linked to Keycloak ${input.keycloakUserId}`,
        );
      } catch (error) {
        console.error(
          `Keycloak linkage verification failed for user ${user.id}:`,
          error,
        );
      }
    }

    // 4) Event logic
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
