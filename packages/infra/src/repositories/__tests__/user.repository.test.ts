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

  it("findAll returns paginated users with total and meta", async () => {
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

    // Mock $transaction returning [findMany, count]
    prismaMock.$transaction.mockResolvedValueOnce([rows, 1]);

    const result = await repo.findAll({
      q: undefined,
      limit: 20,
      offset: 0,
      includeDeleted: false,
      sortBy: "createdAt",
      sortDir: "desc",
    });

    expect(result).toEqual({
      data: rows,
      total: 1,
      limit: 20,
      offset: 0,
      sortBy: "createdAt",
      sortDir: "desc",
    });

    // Verify transaction calls
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    // First call is a PrismaPromise from findMany, second from count
    // Optionally assert arguments:
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      skip: 0,
    });
    expect(prismaMock.user.count).toHaveBeenCalledWith({
      where: { deletedAt: null },
    });
  });

  it("findAll applies q filter on name/email (case-insensitive)", async () => {
    prismaMock.$transaction.mockResolvedValueOnce([[], 0]);
    await repo.findAll({
      q: "alice",
      limit: 10,
      offset: 0,
      includeDeleted: false,
      sortBy: "name",
      sortDir: "asc",
    });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: "alice", mode: "insensitive" } },
          { email: { contains: "alice", mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: 10,
      skip: 0,
    });
    expect(prismaMock.user.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: "alice", mode: "insensitive" } },
          { email: { contains: "alice", mode: "insensitive" } },
        ],
      },
    });
  });

  it("findAll includes soft-deleted when includeDeleted=true", async () => {
    prismaMock.$transaction.mockResolvedValueOnce([[], 0]);
    await repo.findAll({
      q: undefined,
      limit: 5,
      offset: 0,
      includeDeleted: true,
      sortBy: "createdAt",
      sortDir: "desc",
    });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {}, // no deletedAt filter
      orderBy: { createdAt: "desc" },
      take: 5,
      skip: 0,
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

describe("UserRepository.findAllCursor", () => {
  let repo: UserRepository;

  beforeEach(() => {
    repo = new UserRepository();
  });

  it("forward page returns nextCursor when results exist", async () => {
    const rows = [
      {
        id: "a",
        name: "A",
        email: "a@x.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: "b",
        name: "B",
        email: "b@x.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];
    prismaMock.user.findMany.mockResolvedValueOnce(rows as any);

    const res = await repo.findAllCursor({
      q: undefined,
      take: 2,
      cursor: undefined,
      includeDeleted: false,
      sortBy: "id",
      sortDir: "asc",
    });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
      take: 2,
      skip: 0,
      cursor: undefined,
    });

    expect(res).toEqual({
      data: rows,
      nextCursor: { id: "b" },
      prevCursor: undefined,
      sortBy: "id",
      sortDir: "asc",
    });
  });

  it("backward page returns prevCursor when results exist", async () => {
    const rows = [
      {
        id: "c",
        name: "C",
        email: "c@x.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: "d",
        name: "D",
        email: "d@x.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];
    prismaMock.user.findMany.mockResolvedValueOnce(rows as any);

    const res = await repo.findAllCursor({
      q: undefined,
      take: -2,
      cursor: { id: "e" },
      includeDeleted: false,
      sortBy: "id",
      sortDir: "asc",
    });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
      take: -2,
      skip: 1,
      cursor: { id: "e" },
    });

    expect(res).toEqual({
      data: rows,
      nextCursor: undefined,
      prevCursor: { id: "c" },
      sortBy: "id",
      sortDir: "asc",
    });
  });

  it("no cursors when empty page", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([]);
    const res = await repo.findAllCursor({
      take: 10,
      sortBy: "id",
      sortDir: "asc",
      includeDeleted: false,
    });
    expect(res).toEqual({
      data: [],
      nextCursor: undefined,
      prevCursor: undefined,
      sortBy: "id",
      sortDir: "asc",
    });
  });

  it("applies q filter in cursor mode", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([]);
    await repo.findAllCursor({
      q: "al",
      take: 5,
      sortBy: "id",
      sortDir: "asc",
      includeDeleted: false,
    });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: "al", mode: "insensitive" } },
          { email: { contains: "al", mode: "insensitive" } },
        ],
      },
      orderBy: { id: "asc" },
      take: 5,
      skip: 0,
      cursor: undefined,
    });
  });
});
