import { prisma } from "../database/prisma.client";
import {
  CursorPage,
  OffsetListParams,
  OffsetPage,
  TCreateUserDto,
  TCursorPagination,
  TOffsetPagination,
  TUpdateUserDto,
  User,
  UserCursorSortBy,
  UserSortBy,
} from "@repo/shared";
import { IUserRepository } from "../interfaces/IUserRepository";
import { Prisma } from "@prisma/client";

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findAll(
    params: TOffsetPagination,
  ): Promise<OffsetPage<User, UserSortBy>> {
    const {
      q,
      limit = 20,
      offset = 0,
      includeDeleted = false,
      sortBy = "createdAt",
      sortDir = "desc",
    } = params;

    const where: Prisma.UserWhereInput = {};

    if (!includeDeleted) {
      where.deletedAt = null; // exclude soft-deleted by default
    }

    if (q && q.trim() !== "") {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const orderBy = { [sortBy]: sortDir } as const;

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      limit,
      offset,
      sortBy,
      sortDir,
    };
  }

  async findAllCursor(
    params: TCursorPagination,
  ): Promise<CursorPage<User, UserCursorSortBy>> {
    const {
      q,
      take = 20, // positive forward, negative backward
      cursor, // { id: string } after DTO coercion
      includeDeleted = false,
      sortBy = "id",
      sortDir = "asc",
    } = params;

    const where: Prisma.UserWhereInput = {};

    if (!includeDeleted) {
      where.deletedAt = null; // exclude soft-deleted
    }

    if (q && q.trim() !== "") {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    // For cursor pagination, ordering must be deterministic and match the cursor field
    const orderBy = { [sortBy]: sortDir } as const;

    const data = await prisma.user.findMany({
      where,
      orderBy,
      take,
      skip: cursor ? 1 : 0, // skip the cursor row itself
      cursor: cursor ?? undefined, // { id: string }
    });

    const nextCursor =
      take > 0 && data.length > 0 && data[data.length - 1]
        ? { id: data[data.length - 1]!.id }
        : undefined;

    const prevCursor =
      take < 0 && data.length > 0 && data[0] ? { id: data[0]!.id } : undefined;

    return { data, nextCursor, prevCursor, sortBy, sortDir };
  }

  async exists(userId: string): Promise<boolean> {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return !!row;
  }

  async isSoftDeleted(userId: string): Promise<boolean> {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true },
    });
    return !!row?.deletedAt;
  }

  async save(user: User): Promise<void> {
    if (user.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          // include only mutable fields from your schema
          name: user.name,
          email: user.email,
          // ...any other updatable fields
        },
      });
      return;
    }

    // If your schema generates id (uuid/autoincrement), avoid passing id
    await prisma.user.create({
      data: {
        // map only creatable fields; omit id if defaulted by DB
        name: user.name,
        email: user.email,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async create(user: TCreateUserDto): Promise<User> {
    // Same guidance: omit id if DB generates it
    return prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
      },
    });
  }

  async update(
    userId: string,
    patch: TUpdateUserDto,
  ): Promise<{ changed: Record<string, unknown> }> {
    // 1) Sanitize and normalize what you will send to Prisma
    const safeData = {
      email: typeof patch.email === "string" ? patch.email.trim() : undefined,
      name: typeof patch.name === "string" ? patch.name.trim() : undefined,
      // do not set updatedAt manually if your schema uses @updatedAt
    };

    // 2) Compute intended keys from what you will actually send (undefined fields are ignored by Prisma)
    const intended = (
      Object.keys(safeData) as (keyof typeof safeData)[]
    ).filter((k) => safeData[k] !== undefined);

    if (intended.length === 0) {
      return { changed: {} };
    }

    // 3) Perform the update and select only fields you may return
    const updated = await prisma.user.update({
      where: { id: userId },
      data: safeData,
      select: { id: true, name: true, email: true, updatedAt: true },
    });

    // 4) Safe indexing: narrow keys to the actual keys of `updated`
    const isUpdatedKey = (k: PropertyKey): k is keyof typeof updated =>
      k in updated;

    const changed: Record<string, unknown> = {};
    for (const key of intended) {
      if (isUpdatedKey(key)) {
        changed[key as string] = updated[key];
      }
    }

    return { changed };
  }

  async softDelete(userId: string, when: Date): Promise<boolean> {
    // Only mark if not already soft-deleted
    const res = await prisma.user.updateMany({
      where: { id: userId, deletedAt: null },
      data: { deletedAt: when },
    });
    return res.count > 0;
  }

  async hardDelete(userId: string): Promise<boolean> {
    // Idempotent hard delete
    const res = await prisma.user.deleteMany({ where: { id: userId } });
    return res.count > 0;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase(); // keep normalization consistent with use case [web:22]
    return prisma.user.findFirst({
      where: { email: normalized },
    });
  }

  // Clears soft-delete and returns the (now active) user; idempotent
  async reactivate(userId: string): Promise<User> {
    // First, attempt to clear deletedAt only if currently soft-deleted
    const res = await prisma.user.updateMany({
      where: { id: userId, deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    // If nothing changed, either user doesn't exist or is already active; fetch to disambiguate
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      // Prefer throwing a domain-level not-found higher up; repository returns a technical error or null per your conventions
      throw new Error("User not found"); // map to DomainError.NotFound in the use case layer if desired [web:30][web:33]
    }
    return user;
  }
}
