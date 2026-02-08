import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { IUserRepository, IEventPublisher, NewEntity } from "@repo/infra";
import { DomainError } from "@repo/infra";
import type { TUpdateUserDto, UserUpdatedPayload, User } from "@repo/shared";
import { USER_UPDATED } from "@repo/shared";
import { UpdateUserUseCase } from "../../user";
import KcAdminClient from "@keycloak/keycloak-admin-client";

function makeRepo(): Mocked<IUserRepository> {
  return {
    update: vi.fn(),
    // stubs to satisfy type if needed by your interface
    findByEmail: vi.fn() as any,
    create: vi.fn() as any,
    softDelete: vi.fn() as any,
    hardDelete: vi.fn() as any,
    findById: vi.fn() as any,
    reactivate: vi.fn() as any,
    delete: vi.fn() as any,
  } as unknown as Mocked<IUserRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("UpdateUserUseCase", () => {
  let repo: Mocked<IUserRepository>;
  let events: Mocked<IEventPublisher>;
  let kcAdmin: Mocked<KcAdminClient>;
  let uc: UpdateUserUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    events = makeEvents();
    kcAdmin = new KcAdminClient() as unknown as Mocked<KcAdminClient>;
    uc = new UpdateUserUseCase(repo, events, kcAdmin);
  });

  it("trims and validates email and name; rejects empty after trim", async () => {
    await expect(
      uc.execute({ userId: "u1", patch: { email: "   " } as any }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "VALIDATION_FAILED",
      message: "Email cannot be empty",
    });

    await expect(
      uc.execute({ userId: "u1", patch: { name: "   " } as any }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "VALIDATION_FAILED",
      message: "Name cannot be empty",
    });

    expect(repo.update).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("ignores undefined fields and returns changed {} when nothing intended", async () => {
    const result = await uc.execute({
      userId: "u1",
      patch: { email: undefined, name: undefined } as any,
    });

    expect(repo.update).not.toHaveBeenCalled();
    expect(result).toEqual({ changed: {} });
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("passes only intended normalized keys to repository and computes changed intersecting projection", async () => {
    const inputPatch: NewEntity<Partial<any>> = {
      email: "  alice@example.com  ",
      name: undefined, // should be ignored
    };

    const updated: TUpdateUserDto = {
      id: "u1",
      email: "alice@example.com",
      // imagine repo projection also returns updatedAt and maybe name even if not updated
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    } as any;

    repo.update.mockResolvedValueOnce(updated);

    const fixed = new Date("2024-01-02T03:04:05.006Z");
    vi.setSystemTime(fixed);

    const result = await uc.execute({ userId: "u1", patch: inputPatch });

    expect(repo.update).toHaveBeenCalledWith("u1", {
      email: "alice@example.com",
    });

    // changed contains only intended keys that are present in repo's projection
    expect(result).toEqual({
      changed: { email: "alice@example.com" },
    });

    // event payload: changed mirror + updatedAt is now().toISOString()
    expect(events.publish).toHaveBeenCalledWith(USER_UPDATED, {
      userId: "u1",
      changed: { email: "alice@example.com" },
      updatedAt: fixed.toISOString(),
    } satisfies UserUpdatedPayload);

    vi.useRealTimers();
  });

  it("handles multiple fields and keeps only intended keys in changed", async () => {
    const inputPatch = {
      name: "  Alice  ",
      email: "  alice@example.com ",
    };

    const repoProjection: TUpdateUserDto = {
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
      updatedAt: new Date(),
    } as any;

    repo.update.mockResolvedValueOnce(repoProjection);

    const res = await uc.execute({ userId: "u1", patch: inputPatch });

    expect(repo.update).toHaveBeenCalledWith("u1", {
      name: "Alice",
      email: "alice@example.com",
    });

    expect(res).toEqual({
      changed: { name: "Alice", email: "alice@example.com" },
    });

    const payload = events.publish.mock.calls[0]?.[1] as UserUpdatedPayload;
    expect(payload.changed).toEqual({
      name: "Alice",
      email: "alice@example.com",
    });
  });

  it("throws NOT_FOUND and does not publish when repository returns null (user missing)", async () => {
    repo.update.mockResolvedValueOnce(null as any);

    await expect(
      uc.execute({ userId: "missing", patch: { name: "A" } }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "User 'missing' not found",
    });

    expect(events.publish).not.toHaveBeenCalled();
  });

  it("does not include non-intended fields from repo projection in changed", async () => {
    const patch = { name: "  Bob  " };
    const updated = {
      id: "u2",
      name: "Bob",
      email: "bob@example.com", // returned by repo but not intended
      updatedAt: new Date(),
    } as any;

    repo.update.mockResolvedValueOnce(updated);

    const result = await uc.execute({ userId: "u2", patch });

    expect(result).toEqual({ changed: { name: "Bob" } });
  });

  it("propagates repository errors (e.g., EMAIL_IN_USE) and does not publish", async () => {
    const error = new DomainError({
      code: "EMAIL_IN_USE",
      message: "Email already in use",
    });
    repo.update.mockRejectedValueOnce(error);

    await expect(
      uc.execute({ userId: "u1", patch: { email: "taken@example.com" } }),
    ).rejects.toBe(error);

    expect(events.publish).not.toHaveBeenCalled();
  });

  it("publishes with current time; optional: switch to updated.updatedAt if desired", async () => {
    const patch = { name: "Carol" };
    const updated = {
      id: "u3",
      name: "Carol",
      updatedAt: new Date("2024-05-05T10:00:00.000Z"),
    } as any;

    const fixed = new Date("2024-05-05T10:00:05.000Z");
    vi.setSystemTime(fixed);

    repo.update.mockResolvedValueOnce(updated);

    await uc.execute({ userId: "u3", patch });

    const payload = events.publish.mock.calls[0]?.[1] as UserUpdatedPayload;
    expect(payload.updatedAt).toBe(fixed.toISOString());
    // If you decide to emit updated.updatedAt instead, update the assertion accordingly.

    vi.useRealTimers();
  });

  it("returns empty changed when repo projection excludes intended keys (edge case)", async () => {
    const patch = { name: "Dan" };
    // Suppose repo returns only id/updatedAt (projection mismatch)
    const updated = {
      id: "u4",
      updatedAt: new Date(),
    } as unknown as TUpdateUserDto;

    repo.update.mockResolvedValueOnce(updated);

    const res = await uc.execute({ userId: "u4", patch });
    expect(res).toEqual({ changed: {} });

    const payload = events.publish.mock.calls[0]?.[1] as UserUpdatedPayload;
    expect(payload.changed).toEqual({});
  });

  it("does nothing but returns changed {} when patch includes only undefined fields", async () => {
    const res = await uc.execute({
      userId: "u5",
      patch: { name: undefined, email: undefined } as any,
    });
    expect(repo.update).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
    expect(res).toEqual({ changed: {} });
  });
});
