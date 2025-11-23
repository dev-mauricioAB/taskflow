import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { Activity as PrismaActivity, User as PrismaUser, Task as PrismaTask } from "@prisma/client";
import { prismaMock } from "../../database/__mocks__/prisma";

// Ensure repository uses the mocked prisma
vi.mock("../../database/prisma.client", () => ({
  prisma: prismaMock,
}));

// Keep real mapper so the decorator path is exercised end-to-end
vi.mock("../../database/prisma-error-mapper", async (orig) => {
  const real = await orig<typeof import("../../database/prisma-error-mapper")>();
  return { ...real };
});

import { Prisma } from "@prisma/client";
import { ActivityRepository } from "../activity.repository";
import { ERROR_CODES, TCreateActivityDto, TUpdateActivityDto } from "@repo/shared";

describe("ActivityRepository", () => {
  let repo: ActivityRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ActivityRepository();
  });

  describe('create', () => {
    it("throws DomainError NOT_FOUND when actor user does not exist", async () => {
      const dto: TCreateActivityDto = {
        taskId: "t1",
        actorId: "u-missing",
        type: "comment",
        message: "  hello  ",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(null);

      await expect(repo.create(dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        message: "User not found",
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: "u-missing" } });
      expect(prismaMock.task.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.activity.create).not.toHaveBeenCalled();
    });

    it("throws DomainError NOT_FOUND when task does not exist", async () => {
      const dto: TCreateActivityDto = {
        taskId: "t-missing",
        actorId: "u1",
        type: "comment",
        message: "  hello  ",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({ id: "u1" } as PrismaUser);
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce(null);

      await expect(repo.create(dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        message: "Task not found",
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: "u1" } });
      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({ where: { id: "t-missing" } });
      expect(prismaMock.activity.create).not.toHaveBeenCalled();
    });

    it("trims message and creates activity", async () => {
      const dto: TCreateActivityDto = {
        taskId: "t1",
        actorId: "u1",
        type: "comment",
        message: "  some message  ",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({ id: "u1" } as PrismaUser);
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce({ id: "t1" } as PrismaTask);

      const created: PrismaActivity = {
        id: "a1",
        taskId: "t1",
        actorId: "u1",
        type: "comment" as any,
        message: "some message",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      (prismaMock.activity.create as unknown as Mock).mockResolvedValueOnce(created);

      const result = await repo.create(dto);

      expect(prismaMock.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: "t1",
          actorId: "u1",
          type: "comment",
          message: "some message",
        },
      });
      expect(result).toBe(created);
    });

    it("creates activity when message is undefined/null (optional chaining trim safe)", async () => {
      const dto: TCreateActivityDto = {
        taskId: "t1",
        actorId: "u1",
        type: "status_changed",
        message: undefined,
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({ id: "u1" } as PrismaUser);
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce({ id: "t1" } as PrismaTask);

      (prismaMock.activity.create as unknown as Mock).mockResolvedValueOnce({ id: "a1" });

      await repo.create(dto);

      const arg = (prismaMock.activity.create as unknown as Mock).mock.calls.at(-1)?.[0];
      expect(arg.data).toMatchObject({
        taskId: "t1",
        actorId: "u1",
        type: "status_changed",
      });
      // message should exist as undefined if you keep message?.trim()
      expect(Object.prototype.hasOwnProperty.call(arg.data, "message")).toBe(true);
      expect(arg.data.message).toBeUndefined();
    });

    it("maps P2002 (unique constraint) to DomainError 409 per your mapper", async () => {
      const dto: TCreateActivityDto = {
        taskId: "t1",
        actorId: "u1",
        type: "comment",
        message: "dup",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({ id: "u1" } as PrismaUser);
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce({ id: "t1" } as PrismaTask);

      const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["Activity_unique_field"] }, // adjust to actual unique index if any
      });
      (prismaMock.activity.create as unknown as Mock).mockRejectedValueOnce(p2002);

      await expect(repo.create(dto)).rejects.toMatchObject({
        name: "DomainError",
        // Use the code your mapper returns for activities on P2002:
        // if generic: CONFLICT; if specific: adjust accordingly.
        code: ERROR_CODES.EMAIL_IN_USE,
        status: 409,
      });
    });

    it("maps unexpected errors to INTERNAL_SERVER_ERROR 500 via mapper", async () => {
      const dto: TCreateActivityDto = {
        taskId: "t1",
        actorId: "u1",
        type: "comment",
        message: "hello",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({ id: "u1" } as PrismaUser);
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce({ id: "t1" } as PrismaTask);

      const unknown = new Error("db down");
      (prismaMock.activity.create as unknown as Mock).mockRejectedValueOnce(unknown);

      await expect(repo.create(dto)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });

    it("does not remap explicit DomainError thrown by existence checks (pass-through)", async () => {
      const dto: TCreateActivityDto = {
        taskId: "missing",
        actorId: "u1",
        type: "comment",
        message: "x",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({ id: "u1" } as PrismaUser);
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce(null);

      await expect(repo.create(dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        message: "Task not found",
      });
    });
  })

  describe("save", () => {
    it("updates only message by id", async () => {
      const activity = {
        id: "a1",
        message: "Updated message",
        // other fields are ignored by save()
      } as any;

      (prismaMock.activity.update as unknown as Mock).mockResolvedValueOnce({});

      await repo.save(activity);

      expect(prismaMock.activity.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { message: "Updated message" },
      });
    });

    it("maps P2025 (record not found) to DomainError NOT_FOUND 404", async () => {
      const activity = { id: "missing", message: "X" } as any;

      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.activity.update as unknown as Mock).mockRejectedValueOnce(p2025);

      await expect(repo.save(activity)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
        message: "Resource not found",
        cause: p2025,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const activity = { id: "a1", message: "X" } as any;

      const unknown = new Error("db down");
      (prismaMock.activity.update as unknown as Mock).mockRejectedValueOnce(unknown);

      await expect(repo.save(activity)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("delete", () => {
    it("calls prisma.activity.delete with where.id", async () => {
      (prismaMock.activity.delete as unknown as Mock).mockResolvedValueOnce({}); // result ignored

      await repo.delete("a1");

      expect(prismaMock.activity.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
    });

    it("maps P2025 (record not found) to DomainError NOT_FOUND 404", async () => {
      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.activity.delete as unknown as Mock).mockRejectedValueOnce(p2025);

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
      (prismaMock.activity.delete as unknown as Mock).mockRejectedValueOnce(unknown);

      await expect(repo.delete("a1")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("findById", () => {
    it("calls findFirst with id and deletedAt null; returns the activity", async () => {
      const row: PrismaActivity = {
        id: "a1",
        taskId: "t1",
        actorId: "u1",
        type: "comment" as any,
        message: "hello",
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      (prismaMock.activity.findFirst as unknown as Mock).mockResolvedValueOnce(row);

      const result = await repo.findById("a1");

      expect(prismaMock.activity.findFirst).toHaveBeenCalledWith({
        where: { id: "a1", deletedAt: null },
      });
      expect(result).toBe(row);
    });

    it("returns null when not found or soft-deleted", async () => {
      (prismaMock.activity.findFirst as unknown as Mock).mockResolvedValueOnce(null);

      const result = await repo.findById("missing");

      expect(prismaMock.activity.findFirst).toHaveBeenCalledWith({
        where: { id: "missing", deletedAt: null },
      });
      expect(result).toBeNull();
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const validation = new Prisma.PrismaClientValidationError("validation", { clientVersion: '' });
      (prismaMock.activity.findFirst as unknown as Mock).mockRejectedValueOnce(validation);

      await expect(repo.findById("x")).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const unknown = new Error("db down");
      (prismaMock.activity.findFirst as unknown as Mock).mockRejectedValueOnce(unknown);

      await expect(repo.findById("x")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("findActivityByTaskId", () => {
    it("delegates to findMany with taskId and deletedAt null, ordered by createdAt asc; returns rows", async () => {
      const id = "t1";
      const rows: PrismaActivity[] = [
        { id: "a1", taskId: id, actorId: "u1", type: "comment" as any, message: "m1", deletedAt: null, createdAt: new Date("2024-01-01"), updatedAt: new Date() } as any,
        { id: "a2", taskId: id, actorId: "u2", type: "status_changed" as any, message: "m2", deletedAt: null, createdAt: new Date("2024-01-02"), updatedAt: new Date() } as any,
      ];

      (prismaMock.activity.findMany as unknown as Mock).mockResolvedValueOnce(rows);

      const result = await repo.findActivityByTaskId(id);

      expect(prismaMock.activity.findMany).toHaveBeenCalledWith({
        where: { taskId: id, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
      expect(result).toEqual(rows);
    });

    it("returns empty array when no activities match", async () => {
      (prismaMock.activity.findMany as unknown as Mock).mockResolvedValueOnce([]);

      const result = await repo.findActivityByTaskId("t-empty");

      expect(prismaMock.activity.findMany).toHaveBeenCalledWith({
        where: { taskId: "t-empty", deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
      expect(result).toEqual([]);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const validation = new Prisma.PrismaClientValidationError("validation", { clientVersion: '' });
      (prismaMock.activity.findMany as unknown as Mock).mockRejectedValueOnce(validation);

      await expect(repo.findActivityByTaskId("x")).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const unknown = new Error("db down");
      (prismaMock.activity.findMany as unknown as Mock).mockRejectedValueOnce(unknown);

      await expect(repo.findActivityByTaskId("x")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("ActivityRepository.findMany", () => {
    it("builds where with deletedAt null only when no filters provided", async () => {
      const rows: PrismaActivity[] = [
        { id: "a2", taskId: "t1", actorId: "u1", type: "comment" as any, message: "m2", deletedAt: null, createdAt: new Date("2024-01-02"), updatedAt: new Date() } as any,
        { id: "a1", taskId: "t1", actorId: "u1", type: "comment" as any, message: "m1", deletedAt: null, createdAt: new Date("2024-01-01"), updatedAt: new Date() } as any,
      ];
      (prismaMock.activity.findMany as unknown as Mock).mockResolvedValueOnce(rows);

      const result = await repo.findMany({});

      expect(prismaMock.activity.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(rows);
    });

    it("applies taskId filter", async () => {
      (prismaMock.activity.findMany as unknown as Mock).mockResolvedValueOnce([]);

      await repo.findMany({ taskId: "t1" });

      expect(prismaMock.activity.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, taskId: "t1" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("applies actorId filter", async () => {
      (prismaMock.activity.findMany as unknown as Mock).mockResolvedValueOnce([]);

      await repo.findMany({ actorId: "u1" });

      expect(prismaMock.activity.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, actorId: "u1" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("applies type filter", async () => {
      (prismaMock.activity.findMany as unknown as Mock).mockResolvedValueOnce([]);

      await repo.findMany({ type: "status_changed" });

      expect(prismaMock.activity.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, type: "status_changed" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("applies multiple filters together", async () => {
      (prismaMock.activity.findMany as unknown as Mock).mockResolvedValueOnce([]);

      await repo.findMany({ taskId: "t1", actorId: "u2", type: "comment" });

      expect(prismaMock.activity.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, taskId: "t1", actorId: "u2", type: "comment" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("returns empty array when no activities match", async () => {
      (prismaMock.activity.findMany as unknown as Mock).mockResolvedValueOnce([]);

      const result = await repo.findMany({ taskId: "t-empty" });

      expect(result).toEqual([]);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const validation = new Prisma.PrismaClientValidationError("validation", { clientVersion: '' });
      (prismaMock.activity.findMany as unknown as Mock).mockRejectedValueOnce(validation);

      await expect(repo.findMany({ actorId: "x" })).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const unknown = new Error("db down");
      (prismaMock.activity.findMany as unknown as Mock).mockRejectedValueOnce(unknown);

      await expect(repo.findMany({})).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("softDelete", () => {
    it("updates deletedAt when not already soft-deleted; returns true (count>0)", async () => {
      const activityId = "a1";
      const when = new Date("2024-01-01T00:00:00Z");

      (prismaMock.activity.updateMany as unknown as Mock).mockResolvedValueOnce({ count: 1 });

      const result = await repo.softDelete(activityId, when);

      expect(prismaMock.activity.updateMany).toHaveBeenCalledWith({
        where: { id: activityId, deletedAt: null },
        data: { deletedAt: when },
      });
      expect(result).toBe(true);
    });

    it("returns false when already soft-deleted or missing (count=0)", async () => {
      const activityId = "a2";
      const when = new Date("2024-01-02T00:00:00Z");

      (prismaMock.activity.updateMany as unknown as Mock).mockResolvedValueOnce({ count: 0 });

      const result = await repo.softDelete(activityId, when);

      expect(prismaMock.activity.updateMany).toHaveBeenCalledWith({
        where: { id: activityId, deletedAt: null },
        data: { deletedAt: when },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const activityId = "boom";
      const when = new Date();

      const validation = new Prisma.PrismaClientValidationError("validation", { clientVersion: '' });
      (prismaMock.activity.updateMany as unknown as Mock).mockRejectedValueOnce(validation);

      await expect(repo.softDelete(activityId, when)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const activityId = "boom2";
      const when = new Date();
      const unknown = new Error("db down");

      (prismaMock.activity.updateMany as unknown as Mock).mockRejectedValueOnce(unknown);

      await expect(repo.softDelete(activityId, when)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("hardDelete", () => {
    it("calls deleteMany with where.id and returns true when count>0", async () => {
      (prismaMock.activity.deleteMany as unknown as Mock).mockResolvedValueOnce({ count: 1 });

      const result = await repo.hardDelete("a1");

      expect(prismaMock.activity.deleteMany).toHaveBeenCalledWith({ where: { id: "a1" } });
      expect(result).toBe(true);
    });

    it("returns false when nothing was deleted (idempotent)", async () => {
      (prismaMock.activity.deleteMany as unknown as Mock).mockResolvedValueOnce({ count: 0 });

      const result = await repo.hardDelete("missing");

      expect(prismaMock.activity.deleteMany).toHaveBeenCalledWith({ where: { id: "missing" } });
      expect(result).toBe(false);
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500 via mapper", async () => {
      const unknown = new Error("db down");
      (prismaMock.activity.deleteMany as unknown as Mock).mockRejectedValueOnce(unknown);

      await expect(repo.hardDelete("a1")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("exists", () => {
    it("delegates to findUnique with where.id and select.id; returns true when row exists", async () => {
      (prismaMock.activity.findUnique as unknown as Mock).mockResolvedValueOnce({ id: "a1" });

      const result = await repo.exists("a1");

      expect(prismaMock.activity.findUnique).toHaveBeenCalledWith({
        where: { id: "a1" },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it("returns false when row is not found", async () => {
      (prismaMock.activity.findUnique as unknown as Mock).mockResolvedValueOnce(null);

      const result = await repo.exists("missing");

      expect(prismaMock.activity.findUnique).toHaveBeenCalledWith({
        where: { id: "missing" },
        select: { id: true },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const validation = new Prisma.PrismaClientValidationError("validation", { clientVersion: '' });
      (prismaMock.activity.findUnique as unknown as Mock).mockRejectedValueOnce(validation);

      await expect(repo.exists("x")).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const unknown = new Error("db down");
      (prismaMock.activity.findUnique as unknown as Mock).mockRejectedValueOnce(unknown);

      await expect(repo.exists("x")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("isSoftDeleted", () => {
    it("delegates to findUnique with where.id and select.deletedAt; returns true when deletedAt is non-null", async () => {
      (prismaMock.activity.findUnique as unknown as Mock).mockResolvedValueOnce({
        deletedAt: new Date("2024-01-01T00:00:00Z"),
      });

      const result = await repo.isSoftDeleted("a1");

      expect(prismaMock.activity.findUnique).toHaveBeenCalledWith({
        where: { id: "a1" },
        select: { deletedAt: true },
      });
      expect(result).toBe(true);
    });

    it("returns false when row exists but deletedAt is null", async () => {
      (prismaMock.activity.findUnique as unknown as Mock).mockResolvedValueOnce({
        deletedAt: null,
      });

      const result = await repo.isSoftDeleted("a2");

      expect(prismaMock.activity.findUnique).toHaveBeenCalledWith({
        where: { id: "a2" },
        select: { deletedAt: true },
      });
      expect(result).toBe(false);
    });

    it("returns false when row is not found", async () => {
      (prismaMock.activity.findUnique as unknown as Mock).mockResolvedValueOnce(null);

      const result = await repo.isSoftDeleted("missing");

      expect(prismaMock.activity.findUnique).toHaveBeenCalledWith({
        where: { id: "missing" },
        select: { deletedAt: true },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const validation = new Prisma.PrismaClientValidationError("validation", { clientVersion: '' });
      (prismaMock.activity.findUnique as unknown as Mock).mockRejectedValueOnce(validation);

      await expect(repo.isSoftDeleted("x")).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const unknown = new Error("db down");
      (prismaMock.activity.findUnique as unknown as Mock).mockRejectedValueOnce(unknown);

      await expect(repo.isSoftDeleted("x")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("update", () => {
    it("updates with dto and select projection; returns selected fields", async () => {
      const activityId = "a1";
      const dto: TUpdateActivityDto = { message: "Edited" };

      const updated = {
        id: activityId,
        message: "Edited",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      };

      (prismaMock.activity.update as unknown as Mock).mockResolvedValueOnce(updated);

      const res = await repo.update(activityId, dto);

      expect(prismaMock.activity.update).toHaveBeenCalledWith({
        where: { id: activityId },
        data: dto,
        select: {
          id: true,
          message: true,
          createdAt: true,
        },
      });
      expect(res).toEqual(updated);
    });

    it("maps P2025 (record to update not found) to DomainError NOT_FOUND 404", async () => {
      const activityId = "missing";
      const dto: TUpdateActivityDto = { message: "Edited" };

      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.activity.update as unknown as Mock).mockRejectedValueOnce(p2025);

      await expect(repo.update(activityId, dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
        message: "Resource not found",
        cause: p2025,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const activityId = "a1";
      const dto: TUpdateActivityDto = { message: "Edited" };

      const unknown = new Error("db down");
      (prismaMock.activity.update as unknown as Mock).mockRejectedValueOnce(unknown);

      await expect(repo.update(activityId, dto)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });
});
