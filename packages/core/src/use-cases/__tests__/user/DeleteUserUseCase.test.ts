import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type {
  IUserRepository,
  IEventPublisher,
  IIdentityProviderAdmin,
} from "@repo/infra";
import { USER_DELETED } from "@repo/shared";
import { DeleteUserUseCase } from "../../user";

function makeRepo(): Mocked<IUserRepository> {
  return {
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
    findByEmail: vi.fn() as any,
    create: vi.fn() as any,
    findById: vi.fn() as any,
    update: vi.fn() as any,
    delete: vi.fn() as any,
  } as unknown as Mocked<IUserRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

function makeIdentityProvider(): Mocked<IIdentityProviderAdmin> {
  return {
    disableUser: vi.fn(),
    enableUser: vi.fn(),
    updateUser: vi.fn(),
  } as unknown as Mocked<IIdentityProviderAdmin>;
}

describe("DeleteUserUseCase", () => {
  let repo: Mocked<IUserRepository>;
  let events: Mocked<IEventPublisher>;
  let uc: DeleteUserUseCase;
  let identityProvider: Mocked<IIdentityProviderAdmin>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    events = makeEvents();
    identityProvider = makeIdentityProvider();
    uc = new DeleteUserUseCase(repo, events, identityProvider);
  });

  it("soft-deletes by default and publishes USER_DELETED with ISO timestamp", async () => {
    // Freeze time for deterministic ISO
    const fixed = new Date("2024-01-01T12:34:56.789Z");
    vi.setSystemTime(fixed);

    repo.softDelete.mockResolvedValueOnce(true);

    await uc.execute({ userId: "u1" });

    // soft delete path receives Date object
    expect(repo.softDelete).toHaveBeenCalledWith("u1", fixed);

    // event publishes the ISO string corresponding to the same Date
    expect(events.publish).toHaveBeenCalledWith(USER_DELETED, {
      userId: "u1",
      deletedAt: fixed.toISOString(),
      hard: false,
    });

    vi.useRealTimers();
  });

  it("hard-deletes when hard=true and publishes USER_DELETED with ISO timestamp", async () => {
    const fixed = new Date("2024-02-02T00:00:00.000Z");
    vi.setSystemTime(fixed);

    repo.hardDelete.mockResolvedValueOnce(true);

    await uc.execute({ userId: "u2", hard: true });

    // hard delete path does not call softDelete
    expect(repo.hardDelete).toHaveBeenCalledWith("u2");
    expect(repo.softDelete).not.toHaveBeenCalled();

    expect(events.publish).toHaveBeenCalledWith(USER_DELETED, {
      userId: "u2",
      deletedAt: fixed.toISOString(),
      hard: true,
    });

    vi.useRealTimers();
  });

  it("throws NOT_FOUND when soft delete affects no rows and does not publish", async () => {
    repo.softDelete.mockResolvedValueOnce(false);

    await expect(uc.execute({ userId: "missing" })).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "User not found",
    });

    expect(events.publish).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when hard delete affects no rows and does not publish", async () => {
    repo.hardDelete.mockResolvedValueOnce(false);

    await expect(
      uc.execute({ userId: "missing", hard: true }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "User not found",
    });

    expect(events.publish).not.toHaveBeenCalled();
  });

  it("passes the same logical time to softDelete (Date) and event (ISO) in soft delete path", async () => {
    const fixed = new Date("2025-03-15T08:00:00.000Z");
    vi.setSystemTime(fixed);

    repo.softDelete.mockResolvedValueOnce(true);

    await uc.execute({ userId: "u3" });

    // Validate Date identity (deep equality suffices)
    const dateArg = repo.softDelete.mock.calls[0]?.[1];
    expect(dateArg).toEqual(fixed);

    const payload = events.publish.mock.calls[0]?.[1] as any;
    expect(payload.deletedAt).toBe(fixed.toISOString());
    expect(payload.hard).toBe(false);

    vi.useRealTimers();
  });
});
