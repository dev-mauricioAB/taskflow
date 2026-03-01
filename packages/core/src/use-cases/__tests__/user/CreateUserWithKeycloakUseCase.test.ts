import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { IIdentityProviderCreateUser } from "@repo/infra";
import type { User } from "@repo/shared";
import { CreateUserWithKeycloakUseCase, CreateUserUseCase } from "../../user";

function makeIdpCreate(): Mocked<IIdentityProviderCreateUser> {
  return {
    createUser: vi.fn(),
  } as unknown as Mocked<IIdentityProviderCreateUser>;
}

function makeCreateUserUC(): Mocked<CreateUserUseCase> {
  return {
    execute: vi.fn(),
  } as unknown as Mocked<CreateUserUseCase>;
}

describe("CreateUserWithKeycloakUseCase", () => {
  let idpCreate: Mocked<IIdentityProviderCreateUser>;
  let createUserUC: Mocked<CreateUserUseCase>;
  let uc: CreateUserWithKeycloakUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    idpCreate = makeIdpCreate();
    createUserUC = makeCreateUserUC();
    uc = new CreateUserWithKeycloakUseCase(createUserUC, idpCreate);
  });

  it("normalizes name/email, creates identity then app user and returns app user", async () => {
    const input = {
      name: "  Alice  ",
      email: "  ALICE@EXAMPLE.COM  ",
      password: "secret123",
    };
    const externalId = "kc-uuid-1";
    const appUser: User = {
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
      keycloakUserId: externalId,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;

    idpCreate.createUser.mockResolvedValueOnce(externalId);
    createUserUC.execute.mockResolvedValueOnce(appUser);

    const result = await uc.execute(input);

    expect(idpCreate.createUser).toHaveBeenCalledWith({
      name: "Alice",
      email: "alice@example.com",
      password: "secret123",
    });
    expect(createUserUC.execute).toHaveBeenCalledWith({
      name: "Alice",
      email: "alice@example.com",
      keycloakUserId: externalId,
    });
    expect(result).toBe(appUser);
  });

  it("propagates identity provider errors", async () => {
    idpCreate.createUser.mockRejectedValueOnce(new Error("IdP unavailable"));

    await expect(
      uc.execute({
        name: "Bob",
        email: "bob@example.com",
        password: "pwd",
      }),
    ).rejects.toThrow("IdP unavailable");

    expect(createUserUC.execute).not.toHaveBeenCalled();
  });

  it("propagates create user use case errors (e.g. EMAIL_IN_USE)", async () => {
    const { DomainError } = await import("@repo/infra");
    idpCreate.createUser.mockResolvedValueOnce("kc-id");
    createUserUC.execute.mockRejectedValueOnce(
      new DomainError({ code: "EMAIL_IN_USE", message: "Email in use" }),
    );

    await expect(
      uc.execute({
        name: "Bob",
        email: "bob@example.com",
        password: "pwd",
      }),
    ).rejects.toMatchObject({ code: "EMAIL_IN_USE" });
  });
});
