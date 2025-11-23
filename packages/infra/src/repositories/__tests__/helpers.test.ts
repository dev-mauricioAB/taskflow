import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { buildProjectWhere, buildTaskWhere } from "../helpers";

describe("buildProjectWhere", () => {
  it("returns deletedAt null when no filters provided", () => {
    const where = buildProjectWhere({} as any);
    expect(where).toEqual({ deletedAt: null });
  });

  it("adds OR on q across name and description with insensitive mode", () => {
    const where = buildProjectWhere({ q: "crm" });
    expect(where).toEqual({
      OR: [
        { name: { contains: "crm", mode: Prisma.QueryMode.insensitive } },
        { description: { contains: "crm", mode: Prisma.QueryMode.insensitive } },
      ],
      deletedAt: null,
    });
  });

  it("applies ownerId when provided", () => {
    const where = buildProjectWhere({ ownerId: "u1" });
    expect(where).toEqual({ ownerId: "u1", deletedAt: null });
  });

  it("combines q and ownerId", () => {
    const where = buildProjectWhere({ q: "crm", ownerId: "u1" });
    expect(where).toEqual({
      OR: [
        { name: { contains: "crm", mode: Prisma.QueryMode.insensitive } },
        { description: { contains: "crm", mode: Prisma.QueryMode.insensitive } },
      ],
      ownerId: "u1",
      deletedAt: null,
    });
  });

  it("omits deletedAt when includeDeleted is true", () => {
    const where = buildProjectWhere({ includeDeleted: true });
    expect(where).toEqual({});
  });
});

describe("buildTaskWhere", () => {
  it("returns deletedAt null when no filters provided", () => {
    const where = buildTaskWhere({} as any);
    expect(where).toEqual({ deletedAt: null });
  });

  it("adds OR on q across title and description with insensitive mode", () => {
    const where = buildTaskWhere({ q: "fix" });
    expect(where).toEqual({
      OR: [
        { title: { contains: "fix", mode: Prisma.QueryMode.insensitive } },
        { description: { contains: "fix", mode: Prisma.QueryMode.insensitive } },
      ],
      deletedAt: null,
    });
  });

  it("applies projectId, userId, and status when provided", () => {
    const where = buildTaskWhere({
      projectId: "p1",
      userId: "u1",
      status: "inProgress",
    });
    expect(where).toEqual({
      projectId: "p1",
      userId: "u1",
      status: "inProgress",
      deletedAt: null,
    });
  });

  it("combines q with other filters", () => {
    const where = buildTaskWhere({
      q: "fix",
      projectId: "p1",
      userId: "u1",
      status: "todo",
    });
    expect(where).toEqual({
      OR: [
        { title: { contains: "fix", mode: Prisma.QueryMode.insensitive } },
        { description: { contains: "fix", mode: Prisma.QueryMode.insensitive } },
      ],
      projectId: "p1",
      userId: "u1",
      status: "todo",
      deletedAt: null,
    });
  });

  it("omits deletedAt when includeDeleted is true", () => {
    const where = buildTaskWhere({ includeDeleted: true });
    expect(where).toEqual({});
  });
});