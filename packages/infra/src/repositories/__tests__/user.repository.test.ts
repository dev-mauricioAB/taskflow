// tests/UserRepository.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { User } from "@repo/shared";
import { prismaMock } from "../../database/__mocks__/prisma";

// 1) Mock BEFORE importing the SUT
vi.mock("../../database/prisma.client", () => ({
  prisma: prismaMock,
}));

import { UserRepository } from "../user.repository";

describe("UserRepository", () => {
  let repo: UserRepository;

  beforeEach(() => {
    repo = new UserRepository();
  });

  it("findById returns a user or null", async () => {
    const user = {
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-15T12:34:56.000Z"),
      deletedAt: null,
    } satisfies User;

    prismaMock.user.findUnique.mockResolvedValueOnce(user);
    await expect(repo.findById("u1")).resolves.toEqual(user);

    // return null scenario
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(repo.findById("missing")).resolves.toBeNull();

    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(2);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
    });
  });

  it("findAll returns list", async () => {
    const rows = [
      {
        id: "1",
        name: "A",
        email: "a@x.com",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-15T12:34:56.000Z"),
        deletedAt: null,
      },
    ];
    prismaMock.user.findMany.mockResolvedValueOnce(rows);
    await expect(repo.findAll()).resolves.toEqual(rows);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({});
  });

  it("exists returns true/false", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "123" } as any);
    await expect(repo.exists("123")).resolves.toBe(true);

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(repo.exists("nope")).resolves.toBe(false);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: "123" },
      select: { id: true },
    });
  });

  it("isSoftDeleted returns boolean based on deletedAt", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      deletedAt: new Date(),
    } as any);
    await expect(repo.isSoftDeleted("u1")).resolves.toBe(true);

    prismaMock.user.findUnique.mockResolvedValueOnce({
      deletedAt: null,
    } as any);
    await expect(repo.isSoftDeleted("u2")).resolves.toBe(false);

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    await expect(repo.isSoftDeleted("u3")).resolves.toBe(false);
  });

  it("save creates when no id", async () => {
    const input: User = {
      id: "", // or undefined if your type allows
      name: "Bob",
      email: "bob@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    prismaMock.user.create.mockResolvedValueOnce(input as any);

    await expect(repo.save(input)).resolves.toBeUndefined();

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { name: "Bob", email: "bob@example.com" },
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("save updates when id exists", async () => {
    const input: User = {
      id: "u1",
      name: "Alice2",
      email: "alice2@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    prismaMock.user.update.mockResolvedValueOnce(input as any);

    await expect(repo.save(input)).resolves.toBeUndefined();

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Alice2", email: "alice2@example.com" },
    });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("delete removes by id", async () => {
    prismaMock.user.delete.mockResolvedValueOnce({} as any);
    await expect(repo.delete("u1")).resolves.toBeUndefined();
    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: "u1" },
    });
  });

  it("create returns created user", async () => {
    const dto = { name: "New", email: "new@example.com" };
    const created = {
      id: "gen",
      name: "New",
      email: "new@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } satisfies User;

    prismaMock.user.create.mockResolvedValueOnce(created as any);

    await expect(repo.create(dto)).resolves.toEqual(created);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { name: "New", email: "new@example.com" },
    });
  });

  it("update returns changed keys only and respects trim/undefined", async () => {
    const patch = { name: "  John  ", email: undefined };
    const updated = {
      id: "u1",
      name: "John",
      email: "prev@example.com",
      updatedAt: new Date(),
    };
    prismaMock.user.update.mockResolvedValueOnce(updated as any);

    const result = await repo.update("u1", patch);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "John", email: undefined },
      select: { id: true, name: true, email: true, updatedAt: true },
    });
    expect(result).toEqual({ changed: { name: "John" } });
  });

  it("update returns empty changed when patch has no valid fields", async () => {
    const patch = { name: undefined, email: undefined };
    const result = await repo.update("u1", patch as any);
    expect(result).toEqual({ changed: {} });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("softDelete returns true when row updated", async () => {
    prismaMock.user.updateMany.mockResolvedValueOnce({ count: 1 } as any);
    await expect(repo.softDelete("u1", new Date())).resolves.toBe(true);

    prismaMock.user.updateMany.mockResolvedValueOnce({ count: 0 } as any);
    await expect(repo.softDelete("u1", new Date())).resolves.toBe(false);

    expect(prismaMock.user.updateMany).toHaveBeenCalled();
  });

  it("hardDelete returns true when rows deleted", async () => {
    prismaMock.user.deleteMany.mockResolvedValueOnce({ count: 2 } as any);
    await expect(repo.hardDelete("u1")).resolves.toBe(true);

    prismaMock.user.deleteMany.mockResolvedValueOnce({ count: 0 } as any);
    await expect(repo.hardDelete("u1")).resolves.toBe(false);

    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({
      where: { id: "u1" },
    });
  });

  it("findByEmail normalizes and queries", async () => {
    const row = {
      id: "u1",
      name: "A",
      email: "a@x.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } satisfies User;
    prismaMock.user.findFirst.mockResolvedValueOnce(row as any);

    await expect(repo.findByEmail("  A@X.com ")).resolves.toEqual(row);
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { email: "a@x.com" },
    });
  });

  it("reactivate returns user if exists; throws if not found; only updates soft-deleted", async () => {
    // First case: was soft-deleted and updateMany changes 1 row, then findUnique returns current user
    prismaMock.user.updateMany.mockResolvedValueOnce({ count: 1 } as any);
    const activeUser = {
      id: "u1",
      name: "Z",
      email: "z@x.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } satisfies User;
    prismaMock.user.findUnique.mockResolvedValueOnce(activeUser as any);

    await expect(repo.reactivate("u1")).resolves.toEqual(activeUser);
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    // Second case: already active; updateMany count=0, then findUnique returns user
    prismaMock.user.updateMany.mockResolvedValueOnce({ count: 0 } as any);
    prismaMock.user.findUnique.mockResolvedValueOnce(activeUser as any);

    await expect(repo.reactivate("u1")).resolves.toEqual(activeUser);

    // Third case: not found -> throws
    prismaMock.user.updateMany.mockResolvedValueOnce({ count: 0 } as any);
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    await expect(repo.reactivate("missing")).rejects.toThrow("User not found");
  });
});
