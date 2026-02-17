import { IIdentityProviderCreateUser } from "@repo/infra";
import { TCreateKeycloakUserDto } from "@repo/shared";
import { User } from "@repo/shared";
import { CreateUserUseCase } from "./CreateUserUseCase";

/**
 * Orchestrates signup with an identity provider: create identity first, then app user.
 * Keeps Keycloak (or any IdP) orchestration out of the controller.
 */
export class CreateUserWithKeycloakUseCase {
  constructor(
    private readonly createUserUC: CreateUserUseCase,
    private readonly identityProviderCreate: IIdentityProviderCreateUser,
  ) {}

  async execute(input: TCreateKeycloakUserDto): Promise<User> {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();

    const keycloakUserId = await this.identityProviderCreate.createUser({
      name,
      email,
      password: input.password,
    });

    return this.createUserUC.execute({
      name,
      email,
      keycloakUserId,
    });
  }
}
