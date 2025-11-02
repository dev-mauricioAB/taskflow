import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IEventPublisher, IUserRepository } from "@repo/infra";
import { USER_CREATED, type User } from "@repo/shared";
import { DomainError } from "@repo/infra";
import { CreateUserUseCase } from "../../user/CreateUserUseCase";

// Minimal test helpers for typed mocks
function repoMock(): jestlike<IUserRepository> {
  return {
    findByEmail: vi.fn(),
    create: vi.fn(),
  } as unknown as jestlike<IUserRepository>;
}

function eventsMock(): jestlike<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as jestlike<IEventPublisher>;
}

type jestlike<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? ReturnType<typeof vi.fn<(...args: A) => R>>
    : T[K];
};

describe("CreateUserUseCase", () => {
  let users: jestlike<IUserRepository>;
  let events: jestlike<IEventPublisher>;
  let usecase: CreateUserUseCase;

  beforeEach(() => {
    users = repoMock();
    events = eventsMock();
    usecase = new CreateUserUseCase(
      users as unknown as IUserRepository,
      events as unknown as IEventPublisher,
    );
    vi.clearAllMocks();
  });

  it("creates a new user and publishes USER_CREATED when email is unused", async () => {
    users.findByEmail.mockResolvedValueOnce(null);

    const createdAt = new Date("2024-01-01T00:00:00.000Z");
    const newUser: User = {
      id: "u_1",
      name: "alice",
      email: "alice@example.com",
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
    } as any;

    (users.create as any).mockResolvedValueOnce(newUser);

    const result = await usecase.execute({
      name: "  Alice  ",
      email: "  ALICE@example.com  ",
    } as any);

    expect(users.findByEmail).toHaveBeenCalledTimes(1);
    expect(users.findByEmail).toHaveBeenCalledWith("alice@example.com");

    expect(users.create).toHaveBeenCalledTimes(1);
    expect(users.create).toHaveBeenCalledWith({
      name: "Alice", // trimmed
      email: "alice@example.com", // trimmed + lowercased
    });

    expect(result).toStrictEqual(newUser);

    expect(events.publish).toHaveBeenCalledTimes(1);
    const [evt, payload] = (events.publish as any).mock.calls[0];
    expect(evt).toBe(USER_CREATED);
    expect(payload).toStrictEqual({
      userId: "u_1",
      email: "alice@example.com",
      username: "alice", // from returned user.name (not the input)
      createdAt: createdAt.toISOString(),
    });
  });

  it("throws EMAIL_IN_USE when an active user with the email already exists", async () => {
    users.findByEmail.mockResolvedValueOnce({
      id: "u_2",
      name: "Bob",
      email: "bob@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    await expect(
      usecase.execute({ name: "Bob", email: "bob@example.com" }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "EMAIL_IN_USE",
    });

    expect(users.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("throws USER_INACTIVE when a soft-deleted user exists with that email", async () => {
    (users.findByEmail as any).mockResolvedValueOnce({
      id: "u_3",
      name: "Carol",
      email: "carol@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date("2024-06-01T00:00:00.000Z"),
    });

    await expect(
      usecase.execute({ name: "Carol", email: "carol@example.com" }),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "USER_INACTIVE",
    });

    expect(users.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("normalizes input (trim + lowercase) before checking/creating", async () => {
    users.findByEmail.mockResolvedValueOnce(null);

    const now = new Date();
    users.create.mockResolvedValueOnce({
      id: "u_4",
      name: "John",
      email: "john@site.com",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    } satisfies User);

    await usecase.execute({ name: "  John  ", email: "  JOHN@SITE.COM  " });

    expect(users.findByEmail).toHaveBeenCalledWith("john@site.com");
    expect(users.create).toHaveBeenCalledWith({
      name: "John",
      email: "john@site.com",
    });
  });
});
