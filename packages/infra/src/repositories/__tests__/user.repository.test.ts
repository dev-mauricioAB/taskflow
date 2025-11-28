import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import type { User as PrismaUser } from "@prisma/client";
import { prismaMock } from "../../database/__mocks__/prisma";

vi.mock("../../database/prisma.client", () => ({
  prisma: prismaMock,
}));

vi.mock("../../database/prisma-error-mapper", () => ({
  mapPrismaToDomainError: vi.fn(), // leave implementation configurable
}));

// Use the real mapper to validate mapping behavior end-to-end
import { mapPrismaToDomainError } from "../../database/prisma-error-mapper";
vi.mock("../../database/prisma-error-mapper", async (orig) => {
  const real =
    await orig<typeof import("../../database/prisma-error-mapper")>();
  return { ...real };
});

import { Prisma } from "@prisma/client";
import { UserRepository } from "../user.repository";
import { DomainError } from "../../errors";
import {
  ERROR_CODES,
  TUpdateUserDto,
  TUserOffsetPagination,
} from "@repo/shared";

describe("UserRepository", () => {
  let repo = new UserRepository();

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new UserRepository();
  });

  describe("findById", () => {
    it("calls prisma.user.findUnique with correct where.id and returns entity", async () => {
      const id = "user-123";
      const user = {
        id,
        email: "john@example.com",
        name: "John",
      } as unknown as PrismaUser;

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        user,
      );

      const result = await repo.findById(id);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id },
      }); // delegation [web:5]
      expect(result).toBe(user); // pass-through result [web:6]
    });

    it("returns null when not found", async () => {
      const id = "missing";
      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repo.findById(id);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id },
      }); // correct where [web:5]
      expect(result).toBeNull(); // null path [web:6]
    });

    // Helper constructors for Prisma errors with minimal fields used by your mapper
    const knownReqError = (code: string, meta?: Record<string, unknown>) =>
      new Prisma.PrismaClientKnownRequestError("known", {
        code,
        clientVersion: "x",
        meta,
      });

    const validationError = () =>
      new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });

    const initError = () =>
      new Prisma.PrismaClientInitializationError("init", "x");

    const rustPanicError = () =>
      new Prisma.PrismaClientRustPanicError("panic", "x");

    it("maps P2002 to EMAIL_IN_USE 409 with target in details", async () => {
      const err = knownReqError("P2002", { target: ["User_email_key"] });
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.EMAIL_IN_USE,
        status: 409,
        message: "Email already in use",
        details: { target: ["User_email_key"] },
        cause: err,
      } satisfies Partial<DomainError>); // mapper contract
    });

    it("maps P2025 to NOT_FOUND 404", async () => {
      const err = knownReqError("P2025");
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
        message: "Resource not found",
      } satisfies Partial<DomainError>); // not found mapping
    });

    it("maps P2003 to VALIDATION_FAILED 400 with field_name details", async () => {
      const err = knownReqError("P2003", { field_name: "roleId" });
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_FAILED,
        status: 400,
        message: "Related resource does not exist",
        details: { field: "roleId" },
      } satisfies Partial<DomainError>); // foreign key mapping
    });

    it("maps P2011 to VALIDATION_FAILED 400 with column_name details", async () => {
      const err = knownReqError("P2011", { column_name: "email" });
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_FAILED,
        status: 400,
        message: "Required field is missing",
        details: { field: "email" },
      } satisfies Partial<DomainError>); // null constraint mapping
    });

    it("maps P2014 to VALIDATION_FAILED 400", async () => {
      const err = knownReqError("P2014");
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_FAILED,
        status: 400,
        message: "Invalid relationship between records",
      } satisfies Partial<DomainError>); // relation mapping
    });

    it("maps P2000 to VALIDATION_FAILED 400 with column details", async () => {
      const err = knownReqError("P2000", { column_name: "bio" });
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_FAILED,
        status: 400,
        message: "Value exceeds maximum length",
        details: { column: "bio" },
      } satisfies Partial<DomainError>); // too long mapping
    });

    it("maps P2001 to NOT_FOUND 404", async () => {
      const err = knownReqError("P2001");
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
        message: "Related record not found",
      } satisfies Partial<DomainError>); // does not exist mapping
    });

    it("maps unknown KnownRequest code to CONFLICT 409 with prismaCode/meta details", async () => {
      const err = knownReqError("P2999", { foo: "bar" });
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.CONFLICT,
        status: 409,
        message: "Database constraint conflict",
        details: { prismaCode: "P2999", meta: { foo: "bar" } },
      } satisfies Partial<DomainError>); // default branch
    });

    it("maps PrismaClientValidationError to VALIDATION_FAILED with status from httpStatusByCode", async () => {
      const err = validationError();
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      } satisfies Partial<DomainError>); // validation mapping
    });

    it("maps PrismaClientInitializationError to INTERNAL_SERVER_ERROR 500", async () => {
      const err = initError();
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Database connection failed",
      } satisfies Partial<DomainError>); // init mapping
    });

    it("maps PrismaClientRustPanicError to INTERNAL_SERVER_ERROR 500", async () => {
      const err = rustPanicError();
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Database engine error",
      } satisfies Partial<DomainError>); // rust panic mapping
    });

    it("maps unknown error to INTERNAL_SERVER_ERROR 500", async () => {
      const err = new Error("weird");
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        err,
      );

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
      } satisfies Partial<DomainError>); // unknown path
    });
  });

  describe("findAll", () => {
    it("builds default where with deletedAt null, sorts by createdAt desc, paginates, and returns page shape", async () => {
      const params = {} as TUserOffsetPagination;
      const expectedWhere: Prisma.UserWhereInput = { deletedAt: null };
      const expectedOrderBy = { createdAt: "desc" as const };
      const expectedTake = 20;
      const expectedSkip = 0;

      const rows: PrismaUser[] = [
        {
          id: "u1",
          email: "a@x.com",
          name: "A",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        } as any,
      ];
      const total = 1;

      // Mock $transaction to return [findMany, count]
      (prismaMock.$transaction as unknown as Mock).mockResolvedValueOnce([
        rows,
        total,
      ]);

      const result = await repo.findAll(params);

      // Validate the batched queries shape
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      const txArgs = (prismaMock.$transaction as unknown as Mock).mock
        .calls[0]?.[0] as any[];
      // Each element is a Prisma Promise; assert the arguments by inspecting the constructed calls on sub-mocks
      // Alternatively, assert call-through on the model methods directly if your prismaMock records them:

      // Ensure findMany was called with the expected query
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        orderBy: expectedOrderBy,
        take: expectedTake,
        skip: expectedSkip,
      });

      // Ensure count was called with same where
      expect(prismaMock.user.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });

      // Returned page shape
      expect(result).toEqual({
        data: rows,
        total,
        limit: 20,
        offset: 0,
        sortBy: "createdAt",
        sortDir: "desc",
      });
    });

    it("includes deleted when includeDeleted=true", async () => {
      (prismaMock.$transaction as unknown as Mock).mockResolvedValueOnce([
        [],
        0,
      ]);

      await repo.findAll({ includeDeleted: true } as any);

      // where should not constrain deletedAt
      const findManyArgs = (
        prismaMock.user.findMany as unknown as Mock
      ).mock.calls.at(-1)?.[0];
      expect(findManyArgs.where).toEqual({});
      expect(prismaMock.user.count).toHaveBeenCalledWith({ where: {} });
    });

    it("applies case-insensitive OR search on name and email when q is non-empty", async () => {
      (prismaMock.$transaction as unknown as Mock).mockResolvedValueOnce([
        [],
        0,
      ]);

      await repo.findAll({ q: "john" } as any);

      const findManyArgs = (
        prismaMock.user.findMany as unknown as Mock
      ).mock.calls.at(-1)?.[0];
      expect(findManyArgs.where).toEqual({
        deletedAt: null,
        OR: [
          { name: { contains: "john", mode: "insensitive" } },
          { email: { contains: "john", mode: "insensitive" } },
        ],
      } satisfies Prisma.UserWhereInput);
    });

    it("ignores blank q (spaces) and does not add OR", async () => {
      (prismaMock.$transaction as unknown as Mock).mockResolvedValueOnce([
        [],
        0,
      ]);

      await repo.findAll({ q: "   " } as any);

      const findManyArgs = (
        prismaMock.user.findMany as unknown as Mock
      ).mock.calls.at(-1)?.[0];
      expect(findManyArgs.where).toEqual({ deletedAt: null });
    });

    it("honors custom pagination and sorting", async () => {
      (prismaMock.$transaction as unknown as Mock).mockResolvedValueOnce([
        [],
        0,
      ]);

      await repo.findAll({
        limit: 5,
        offset: 10,
        sortBy: "email",
        sortDir: "asc",
      } as any);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { email: "asc" },
        take: 5,
        skip: 10,
      });
    });

    it("propagates and maps Prisma known request error through decorator (e.g., P2000)", async () => {
      // Simulate the $transaction rejecting with a Prisma error
      const p2000 = new Prisma.PrismaClientKnownRequestError("too long", {
        code: "P2000",
        clientVersion: "x",
        meta: { column_name: "email" },
      });
      (prismaMock.$transaction as unknown as Mock).mockRejectedValueOnce(p2000);

      await expect(repo.findAll({ q: "x" } as any)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        status: 400,
        message: "Value exceeds maximum length",
        details: { column: "email" },
        cause: p2000,
      });
    });

    it("propagates and maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const unknown = new Error("boom");
      (prismaMock.$transaction as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.findAll({ limit: 1 } as any)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("exists", () => {
    it("delegates to findUnique with where.id and select.id", async () => {
      const id = "user-1";
      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id,
      } as Pick<PrismaUser, "id">);

      const result = await repo.exists(id);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it("returns false when findUnique returns null", async () => {
      const id = "missing";
      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repo.exists(id);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id },
        select: { id: true },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma errors via decorator/mapper (e.g., P2025) and throws DomainError", async () => {
      const id = "boom";
      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        p2025,
      );

      await expect(repo.exists(id)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
        message: "Resource not found",
        cause: p2025,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const id = "boom2";
      const unknown = new Error("db down");
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.exists(id)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("isSoftDeleted", () => {
    it("delegates to findUnique with where.id and select.deletedAt", async () => {
      const userId = "u1";
      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        deletedAt: new Date(),
      } as Pick<PrismaUser, "deletedAt">);

      const result = await repo.isSoftDeleted(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { deletedAt: true },
      });
      expect(result).toBe(true);
    });

    it("returns false when row exists but deletedAt is null", async () => {
      const userId = "u2";
      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        deletedAt: null,
      } as Pick<PrismaUser, "deletedAt">);

      const result = await repo.isSoftDeleted(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { deletedAt: true },
      });
      expect(result).toBe(false);
    });

    it("returns false when row is not found", async () => {
      const userId = "missing";
      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repo.isSoftDeleted(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { deletedAt: true },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma errors via decorator/mapper (e.g., P2003) and throws DomainError", async () => {
      const userId = "boom";
      const p2003 = new Prisma.PrismaClientKnownRequestError("fk fail", {
        code: "P2003",
        clientVersion: "x",
        meta: { field_name: "userId" },
      });
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        p2003,
      );

      await expect(repo.isSoftDeleted(userId)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        status: 400,
        message: "Related resource does not exist",
        details: { field: "userId" },
        cause: p2003,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const userId = "boom2";
      const unknown = new Error("db down");
      (prismaMock.user.findUnique as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.isSoftDeleted(userId)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("save", () => {
    it("updates when id is present", async () => {
      const input = { id: "u1", name: "Jane Doe", email: "jane@example.com" };

      (prismaMock.user.update as unknown as Mock).mockResolvedValueOnce({}); // result ignored by save()

      await repo.save(input);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: "u1" },
        data: { name: "Jane Doe", email: "jane@example.com" },
      });
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("creates when id is absent", async () => {
      const input = { name: "John Doe", email: "john@example.com" };

      (prismaMock.user.create as unknown as Mock).mockResolvedValueOnce({}); // result ignored

      await repo.save(input);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: { name: "John Doe", email: "john@example.com" },
      });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it("maps P2002 unique constraint (email) to DomainError on create", async () => {
      const input = { name: "Dup", email: "dup@example.com" };
      const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["User_email_key"] },
      });
      (prismaMock.user.create as unknown as Mock).mockRejectedValueOnce(p2002);

      await expect(repo.save(input)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.EMAIL_IN_USE,
        status: 409,
        message: "Email already in use",
        details: { target: ["User_email_key"] },
        cause: p2002,
      });
    });

    it("maps P2002 unique constraint (email) to DomainError on update", async () => {
      const input = { id: "u1", name: "Dup", email: "dup@example.com" };
      const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["User_email_key"] },
      });
      (prismaMock.user.update as unknown as Mock).mockRejectedValueOnce(p2002);

      await expect(repo.save(input)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.EMAIL_IN_USE,
        status: 409,
        message: "Email already in use",
        details: { target: ["User_email_key"] },
        cause: p2002,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const input = { name: "X", email: "x@example.com" };
      const unknown = new Error("db down");
      (prismaMock.user.create as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.save(input)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("delete", () => {
    it("calls prisma.user.delete with where.id", async () => {
      (prismaMock.user.delete as unknown as Mock).mockResolvedValueOnce({}); // result ignored

      await repo.delete("u1");

      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: "u1" },
      });
    });

    it("maps P2025 (record not found) via decorator/mapper to DomainError NOT_FOUND 404", async () => {
      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.user.delete as unknown as Mock).mockRejectedValueOnce(p2025);

      await expect(repo.delete("missing")).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
        message: "Resource not found",
        cause: p2025,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const unknown = new Error("db down");
      (prismaMock.user.delete as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.delete("u1")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("create", () => {
    it("calls prisma.user.create with data { name, email } and returns created user", async () => {
      const dto = { name: "Alice", email: "alice@example.com" };
      const created: PrismaUser = {
        id: "u1",
        name: dto.name,
        email: dto.email,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any;

      (prismaMock.user.create as unknown as Mock).mockResolvedValueOnce(
        created,
      );

      const result = await repo.create(dto);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: { name: "Alice", email: "alice@example.com" },
      });
      expect(result).toBe(created);
    });

    it("maps P2002 unique email to DomainError 409 with target meta", async () => {
      const dto = { name: "Dup", email: "dup@example.com" };
      const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["User_email_key"] },
      });
      (prismaMock.user.create as unknown as Mock).mockRejectedValueOnce(p2002);

      await expect(repo.create(dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.EMAIL_IN_USE,
        status: 409,
        message: "Email already in use",
        details: { target: ["User_email_key"] },
        cause: p2002,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const dto = { name: "X", email: "x@example.com" };
      const unknown = new Error("db down");
      (prismaMock.user.create as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.create(dto)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("update", () => {
    it("calls prisma.user.update with where.id, data=patch, select subset, and returns selected fields", async () => {
      const userId = "u1";
      const patch: TUpdateUserDto = { name: "New Name" };
      const selected = {
        id: userId,
        name: "New Name",
        email: "old@example.com",
        updatedAt: new Date(),
      };

      (prismaMock.user.update as unknown as Mock).mockResolvedValueOnce(
        selected,
      );

      const result = await repo.update(userId, patch);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: patch,
        select: { id: true, name: true, email: true, updatedAt: true },
      });
      expect(result).toEqual(selected);
    });

    it("propagates P2025 (record to update not found) via mapper to NOT_FOUND 404", async () => {
      const userId = "missing";
      const patch: TUpdateUserDto = { name: "X" };
      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.user.update as unknown as Mock).mockRejectedValueOnce(p2025);

      await expect(repo.update(userId, patch)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
        message: "Resource not found",
        cause: p2025,
      });
    });

    it("maps P2002 unique constraint (email) to DomainError 409", async () => {
      const userId = "u1";
      const patch: TUpdateUserDto = { email: "dup@example.com" };
      const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["User_email_key"] },
      });
      (prismaMock.user.update as unknown as Mock).mockRejectedValueOnce(p2002);

      await expect(repo.update(userId, patch)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.EMAIL_IN_USE,
        status: 409,
        message: "Email already in use",
        details: { target: ["User_email_key"] },
        cause: p2002,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const userId = "u1";
      const patch: TUpdateUserDto = { name: "Y" };
      const unknown = new Error("db down");
      (prismaMock.user.update as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.update(userId, patch)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("softDelete", () => {
    it("calls updateMany with where { id, deletedAt: null } and data { deletedAt: when } and returns true when count>0", async () => {
      const userId = "u1";
      const when = new Date("2024-01-01T00:00:00Z");
      (prismaMock.user.updateMany as unknown as Mock).mockResolvedValueOnce({
        count: 1,
      });

      const result = await repo.softDelete(userId, when);

      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: { id: userId, deletedAt: null },
        data: { deletedAt: when },
      });
      expect(result).toBe(true);
    });

    it("returns false when no rows are updated (already soft-deleted or not found)", async () => {
      const userId = "u2";
      const when = new Date("2024-01-02T00:00:00Z");
      (prismaMock.user.updateMany as unknown as Mock).mockResolvedValueOnce({
        count: 0,
      });

      const result = await repo.softDelete(userId, when);

      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: { id: userId, deletedAt: null },
        data: { deletedAt: when },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma errors via decorator/mapper (e.g., validation) and throws DomainError", async () => {
      const userId = "u3";
      const when = new Date("invalid"); // any input; error is mocked below
      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.user.updateMany as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(repo.softDelete(userId, when)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const userId = "u4";
      const when = new Date();
      const unknown = new Error("db down");
      (prismaMock.user.updateMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.softDelete(userId, when)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("hardDelete", () => {
    it("calls deleteMany with where.id and returns true when count>0", async () => {
      (prismaMock.user.deleteMany as unknown as Mock).mockResolvedValueOnce({
        count: 1,
      });

      const result = await repo.hardDelete("u1");

      expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({
        where: { id: "u1" },
      });
      expect(result).toBe(true);
    });

    it("returns false when no rows deleted (idempotent)", async () => {
      (prismaMock.user.deleteMany as unknown as Mock).mockResolvedValueOnce({
        count: 0,
      });

      const result = await repo.hardDelete("missing");

      expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({
        where: { id: "missing" },
      });
      expect(result).toBe(false);
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500 via mapper", async () => {
      const unknown = new Error("db down");
      (prismaMock.user.deleteMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.hardDelete("u1")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("findByEmail", () => {
    it("calls prisma.user.findFirst with where.email and returns the user", async () => {
      const email = "alice@example.com";
      const user = {
        id: "u1",
        email,
        name: "Alice",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as unknown as PrismaUser;

      (prismaMock.user.findFirst as unknown as Mock).mockResolvedValueOnce(
        user,
      );

      const result = await repo.findByEmail(email);

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toBe(user);
    });

    it("returns null when no user matches", async () => {
      const email = "missing@example.com";
      (prismaMock.user.findFirst as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repo.findByEmail(email);

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toBeNull();
    });

    it("maps Prisma errors via decorator/mapper and throws DomainError", async () => {
      const email = "boom@example.com";
      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.user.findFirst as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(repo.findByEmail(email)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const email = "x@example.com";
      const unknown = new Error("db down");
      (prismaMock.user.findFirst as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.findByEmail(email)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("reactivate", () => {
    it("throws DomainError NOT_FOUND when user does not exist", async () => {
      const userId = "missing";
      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      await expect(repo.reactivate(userId)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        message: "User not found",
      });
      expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
    });

    it("clears deletedAt when user exists and was soft-deleted; returns original user", async () => {
      const userId = "u1";
      const softDeletedUser: PrismaUser = {
        id: userId,
        name: "Alice",
        email: "alice@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      } as any;

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        softDeletedUser,
      );
      (prismaMock.user.updateMany as unknown as Mock).mockResolvedValueOnce({
        count: 1,
      });

      const result = await repo.reactivate(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: { id: userId, deletedAt: { not: null } },
        data: { deletedAt: null },
      });
      expect(result).toBe(softDeletedUser);
    });

    it("does nothing (idempotent) when user exists and is already active; returns original user", async () => {
      const userId = "u2";
      const activeUser: PrismaUser = {
        id: userId,
        name: "Bob",
        email: "bob@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any;

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        activeUser,
      );
      (prismaMock.user.updateMany as unknown as Mock).mockResolvedValueOnce({
        count: 0,
      });

      const result = await repo.reactivate(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: { id: userId, deletedAt: { not: null } },
        data: { deletedAt: null },
      });
      expect(result).toBe(activeUser);
    });

    it("maps Prisma errors thrown by updateMany via decorator/mapper (e.g., validation) to DomainError", async () => {
      const userId = "u3";
      const existingUser = { id: userId } as PrismaUser;
      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        existingUser,
      );

      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.user.updateMany as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(repo.reactivate(userId)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const userId = "u4";
      const existingUser = { id: userId } as PrismaUser;
      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        existingUser,
      );

      const unknown = new Error("db down");
      (prismaMock.user.updateMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.reactivate(userId)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });
});
