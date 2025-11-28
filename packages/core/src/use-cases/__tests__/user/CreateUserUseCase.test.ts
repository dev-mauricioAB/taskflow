import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { IUserRepository, IEventPublisher, NewEntity } from "@repo/infra";
import { DomainError } from "@repo/infra";
import type { User } from "@repo/shared";
import { USER_CREATED } from "@repo/shared";
import { CreateUserUseCase } from "../../user";

function makeRepo(): Mocked<IUserRepository> {
  return {
    findByEmail: vi.fn(),
    create: vi.fn(),
    findById: vi.fn() as any,
    update: vi.fn() as any,
    delete: vi.fn() as any,
    // add any additional methods your interface defines as vi.fn()
  } as unknown as Mocked<IUserRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("CreateUserUseCase", () => {
  let repo: Mocked<IUserRepository>;
  let events: Mocked<IEventPublisher>;
  let uc: CreateUserUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    events = makeEvents();
    uc = new CreateUserUseCase(repo, events);
  });

  it("trims and normalizes input; creates and publishes when not existing", async () => {
    const input = { name: "  Alice  ", email: "  ALICE@EXAMPLE.COM  " };

    repo.findByEmail.mockResolvedValueOnce(null);

    const createdAt = new Date("2024-01-01T12:00:00.000Z");
    const created: User = {
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
      createdAt,
      updatedAt: createdAt,
      deletedAt: null as any,
    } as User;

    repo.create.mockImplementationOnce(async (entity: NewEntity<User>) => {
      expect(entity).toEqual({ name: "Alice", email: "alice@example.com" });
      return created;
    });

    const result = await uc.execute(input);

    expect(repo.findByEmail).toHaveBeenCalledWith("alice@example.com");
    expect(repo.create).toHaveBeenCalledTimes(1);

    expect(events.publish).toHaveBeenCalledWith(USER_CREATED, {
      userId: "u1",
      email: "alice@example.com",
      username: "Alice",
      createdAt: createdAt.toISOString(),
    });

    expect(result).toBe(created);
  });

  it("throws USER_INACTIVE when an inactive user exists with same email", async () => {
    const input = { name: "Bob", email: "bob@example.com" };
    const existing: User = {
      id: "u2",
      name: "Bob",
      email: "bob@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(), // soft-deleted
    } as User;

    repo.findByEmail.mockResolvedValueOnce(existing);

    await expect(uc.execute(input)).rejects.toMatchObject({
      name: "DomainError",
      code: "USER_INACTIVE",
      message:
        "An account with this email exists but is inactive. Reactivate the account to proceed.",
      details: { email: "bob@example.com" },
    });

    expect(repo.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("throws EMAIL_IN_USE when an active user exists with same email", async () => {
    const input = { name: "Eve", email: "eve@Example.com" };
    const existing: User = {
      id: "u3",
      name: "Eve",
      email: "eve@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
    } as User;

    repo.findByEmail.mockResolvedValueOnce(existing);

    await expect(uc.execute(input)).rejects.toMatchObject({
      name: "DomainError",
      code: "EMAIL_IN_USE",
      message: "An active account with this email already exists.",
      details: { email: "eve@example.com" },
    });

    expect(repo.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("lowercases and trims email before existence check", async () => {
    const input = { name: "Zoe", email: "  ZOE@EXAMPLE.COM  " };

    repo.findByEmail.mockResolvedValueOnce(null);
    repo.create.mockResolvedValueOnce({
      id: "u9",
      name: "Zoe",
      email: "zoe@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
    } as User);

    await uc.execute(input);

    expect(repo.findByEmail).toHaveBeenCalledWith("zoe@example.com");
    expect(repo.create).toHaveBeenCalledWith({
      name: "Zoe",
      email: "zoe@example.com",
    });
  });

  it("maps repository unique race (EMAIL_IN_USE) to DomainError and does not publish event", async () => {
    const input = { name: "Kay", email: "kay@example.com" };

    repo.findByEmail.mockResolvedValueOnce(null);

    const domainConflict = new DomainError({
      code: "EMAIL_IN_USE",
      message: "An active account with this email already exists.",
      details: { email: "kay@example.com" },
    });

    // Simulate repo unique constraint mapping (e.g., P2002 transformed to DomainError)
    repo.create.mockRejectedValueOnce(domainConflict);

    await expect(uc.execute(input)).rejects.toMatchObject({
      name: "DomainError",
      code: "EMAIL_IN_USE",
    });

    expect(events.publish).not.toHaveBeenCalled();
  });

  it("does not publish event if throwing USER_INACTIVE", async () => {
    const input = { name: "Ann", email: "ann@example.com" };
    repo.findByEmail.mockResolvedValueOnce({
      id: "u10",
      name: "Ann",
      email: "ann@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
    } as User);

    await expect(uc.execute(input)).rejects.toMatchObject({
      code: "USER_INACTIVE",
    });

    expect(events.publish).not.toHaveBeenCalled();
  });
});
