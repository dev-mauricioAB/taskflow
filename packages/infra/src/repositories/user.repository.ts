import { prisma } from "../database/prisma.client";
import {
  CursorPage,
  OffsetPage,
  type TCreateUserDto,
  type TUserCursorPagination,
  type TUserOffsetPagination,
  type TUpdateUserDto,
  User,
  CursorSortBy,
  UserSortBy,
} from "@repo/shared";
import { IUserRepository } from "../interfaces/IUserRepository";
import { Prisma } from "@prisma/client";
import { DomainError } from "../errors";
import { HandleAllPrismaErrors } from "../database/decorators/handle-prisma-errors";

@HandleAllPrismaErrors
export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findAll(
    params: TUserOffsetPagination,
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
    params: TUserCursorPagination,
  ): Promise<CursorPage<User, CursorSortBy>> {
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

  async save(user: {
    id?: string;
    name: string;
    email: string;
  }): Promise<void> {
    if (user.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: user.name, email: user.email },
      });
      return;
    }

    await prisma.user.create({
      data: { name: user.name, email: user.email },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async create(user: TCreateUserDto): Promise<User> {
    return prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
      },
    });
  }

  async update(userId: string, patch: TUpdateUserDto): Promise<TUpdateUserDto> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: patch,
      select: { id: true, name: true, email: true, updatedAt: true },
    });

    return updated;
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
    return prisma.user.findFirst({
      where: { email },
    });
  }

  // Clears soft-delete and returns the (now active) user; idempotent
  async reactivate(userId: string): Promise<User> {
    // If nothing changed, either user doesn't exist or is already active; fetch to disambiguate
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new DomainError({ code: "NOT_FOUND", message: "User not found" });
    }

    await prisma.user.updateMany({
      where: { id: userId, deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    return user;
  }
}
