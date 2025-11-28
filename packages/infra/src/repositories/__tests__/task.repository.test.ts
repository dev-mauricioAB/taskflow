import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { Task as PrismaTask } from "@prisma/client";
import { prismaMock } from "../../database/__mocks__/prisma";
import { ERROR_CODES, TCreateTaskDto, TUpdateTaskDto } from "@repo/shared";

// Hoist spies so they exist before module evaluation
const mocks = vi.hoisted(() => ({
  buildTaskWhere: vi.fn(),
}));

// 1) Mock prisma before importing repo
vi.mock("../../database/prisma.client", () => ({
  prisma: prismaMock,
}));

// 2) Mock the exact module path that TaskRepository imports
// If TaskRepository does: import { buildTaskWhere } from "../build-task-where";
vi.mock("../helpers", () => ({
  buildTaskWhere: mocks.buildTaskWhere,
}));

// 3) Keep real error mapper (optional, for decorator consistency)
vi.mock("../../database/prisma-error-mapper", async (orig) => {
  const real =
    await orig<typeof import("../../database/prisma-error-mapper")>();
  return { ...real };
});

import {
  Prisma,
  User as PrismaUser,
  Project as PrismaProject,
} from "@prisma/client";
import { TaskRepository } from "../task.repository";

describe("TaskRepository", () => {
  let repo: TaskRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new TaskRepository();
  });

  describe("findById", () => {
    it("delegates to prisma.task.findUnique with where.id and returns the task", async () => {
      const id = "task-123";
      const task = {
        id,
        title: "Do something",
        description: "Details",
        createdAt: new Date(),
        updatedAt: new Date(),
        // add other required fields from your schema
      } as unknown as PrismaTask;

      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce(
        task,
      );

      const result = await repo.findById(id);

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toBe(task);
    });

    it("returns null when task is not found", async () => {
      const id = "missing-task";
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repo.findById(id);

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toBeNull();
    });

    it("maps Prisma errors via decorator/mapper (e.g., P2025) and throws DomainError", async () => {
      const id = "boom";
      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.task.findUnique as unknown as Mock).mockRejectedValueOnce(
        p2025,
      );

      await expect(repo.findById(id)).rejects.toMatchObject({
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
      (prismaMock.task.findUnique as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.findById(id)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("save", () => {
    it("updates when task.id is present with the expected data projection", async () => {
      const task: PrismaTask = {
        id: "t1",
        title: "Fix bug",
        description: "Details",
        status: "OPEN" as any, // adjust enum if needed
        projectId: "p1",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      (prismaMock.task.update as unknown as Mock).mockResolvedValueOnce({});

      await repo.save(task);

      expect(prismaMock.task.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: {
          title: "Fix bug",
          description: "Details",
          status: "OPEN",
          projectId: "p1",
        },
      });
      expect(prismaMock.task.create).not.toHaveBeenCalled();
    });

    it("creates when task.id is absent with the entire task as data", async () => {
      const task = {
        // no id
        title: "New task",
        description: "Do it",
        status: "OPEN",
        projectId: "p1",
      } as any;

      (prismaMock.task.create as unknown as Mock).mockResolvedValueOnce({});

      await repo.save(task);

      expect(prismaMock.task.create).toHaveBeenCalledWith({
        data: task,
      });
      expect(prismaMock.task.update).not.toHaveBeenCalled();
    });

    it("maps unique constraint on create (P2002) to DomainError 409", async () => {
      const task = {
        title: "Duplicate",
        description: "dup",
        status: "OPEN",
        projectId: "p1",
      } as any;
      const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["Task_unique_key_or_title"] }, // depends on schema
      });

      (prismaMock.task.create as unknown as Mock).mockRejectedValueOnce(p2002);

      await expect(repo.save(task)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.EMAIL_IN_USE /* or a specific code if your mapper maps Task's unique to another */,
        status: 409,
      });
    });

    it("maps unique constraint on update (P2002) to DomainError 409", async () => {
      const task = {
        id: "t1",
        title: "Duplicate",
        description: "dup",
        status: "OPEN",
        projectId: "p1",
      } as any;
      const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["Task_unique_key_or_title"] },
      });

      (prismaMock.task.update as unknown as Mock).mockRejectedValueOnce(p2002);

      await expect(repo.save(task as any)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.EMAIL_IN_USE /* or specific code */,
        status: 409,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const task = {
        title: "X",
        description: "Y",
        status: "OPEN",
        projectId: "p1",
      } as any;
      const unknown = new Error("db down");

      (prismaMock.task.create as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.save(task)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
      });
    });
  });

  describe("delete", () => {
    it("calls prisma.task.delete with where.id", async () => {
      (prismaMock.task.delete as unknown as Mock).mockResolvedValueOnce({}); // result is ignored

      await repo.delete("t1");

      expect(prismaMock.task.delete).toHaveBeenCalledWith({
        where: { id: "t1" },
      });
    });

    it("maps P2025 (record not found) to DomainError NOT_FOUND 404", async () => {
      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.task.delete as unknown as Mock).mockRejectedValueOnce(p2025);

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
      (prismaMock.task.delete as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.delete("t1")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("findByProjectId", () => {
    it("calls prisma.task.findMany with where.projectId and returns tasks", async () => {
      const projectId = "p1";
      const tasks: PrismaTask[] = [
        {
          id: "t1",
          title: "Spec",
          description: "Write spec",
          status: "OPEN" as any,
          projectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        {
          id: "t2",
          title: "Implement",
          description: "Do work",
          status: "IN_PROGRESS" as any,
          projectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ];

      (prismaMock.task.findMany as unknown as Mock).mockResolvedValueOnce(
        tasks,
      );

      const result = await repo.findByProjectId(projectId);

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: { projectId },
      });
      expect(result).toEqual(tasks);
    });

    it("returns empty array when no tasks match", async () => {
      const projectId = "empty";
      (prismaMock.task.findMany as unknown as Mock).mockResolvedValueOnce([]);

      const result = await repo.findByProjectId(projectId);

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: { projectId },
      });
      expect(result).toEqual([]);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const projectId = "boom";
      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.task.findMany as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(repo.findByProjectId(projectId)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const projectId = "boom2";
      const unknown = new Error("db down");
      (prismaMock.task.findMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.findByProjectId(projectId)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("create", () => {
    it("throws DomainError NOT_FOUND when owner user does not exist", async () => {
      const dto: TCreateTaskDto = {
        title: " Task ",
        description: " Desc ",
        status: "inProgress",
        userId: "u-missing",
        projectId: "p1",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      await expect(repo.create(dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        message: "Owner user not found",
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u-missing" },
      });
      expect(prismaMock.project.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.task.create).not.toHaveBeenCalled();
    });

    it("throws DomainError NOT_FOUND when project does not exist", async () => {
      const dto: TCreateTaskDto = {
        title: " Task ",
        description: " Desc ",
        status: "inProgress",
        userId: "u1",
        projectId: "p-missing",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "u1",
      } as PrismaUser);
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      await expect(repo.create(dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        message: "Project not found",
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
      });
      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: "p-missing" },
      });
      expect(prismaMock.task.create).not.toHaveBeenCalled();
    });

    it("trims title and description, builds data, and creates task", async () => {
      const dto: TCreateTaskDto = {
        title: "  My Task  ",
        description: "  Some desc  ",
        status: "inProgress",
        userId: "u1",
        projectId: "p1",
      };

      const user = { id: "u1" } as PrismaUser;
      const project = { id: "p1" } as PrismaProject;
      const created: PrismaTask = {
        id: "t1",
        title: "My Task",
        description: "Some desc",
        status: "OPEN" as any,
        userId: "u1",
        projectId: "p1",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        user,
      );
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce(
        project,
      );
      (prismaMock.task.create as unknown as Mock).mockResolvedValueOnce(
        created,
      );

      const result = await repo.create(dto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
      });
      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: "p1" },
      });
      expect(prismaMock.task.create).toHaveBeenCalledWith({
        data: {
          title: "My Task",
          description: "Some desc",
          status: "inProgress",
          userId: "u1",
          projectId: "p1",
        },
      });
      expect(result).toBe(created);
    });

    it("handles null/undefined description: trims to undefined and creates task", async () => {
      const dto: TCreateTaskDto = {
        title: "  Title  ",
        description: undefined,
        status: "inProgress",
        userId: "u1",
        projectId: "p1",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "u1",
      } as PrismaUser);
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "p1",
      } as PrismaProject);
      (prismaMock.task.create as unknown as Mock).mockResolvedValueOnce({
        id: "t1",
      });

      await repo.create(dto);

      // When description is undefined, ensure no accidental "  ".trim() access error and data omits description or passes undefined
      const callArg = (prismaMock.task.create as unknown as Mock).mock.calls.at(
        -1,
      )?.[0];
      expect(callArg.data).toMatchObject({
        title: "Title",
        status: "inProgress",
        userId: "u1",
        projectId: "p1",
      });
      // If your code uses optional chaining dto.description?.trim(), undefined is fine
      expect(
        Object.prototype.hasOwnProperty.call(callArg.data, "description"),
      ).toBe(true);
      expect(callArg.data.description).toBeUndefined();
    });

    it("maps unexpected Prisma errors to DomainError via decorator/mapper", async () => {
      const dto: TCreateTaskDto = {
        title: "Title",
        description: "Desc",
        status: "inProgress",
        userId: "u1",
        projectId: "p1",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "u1",
      } as PrismaUser);
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "p1",
      } as PrismaProject);

      const unknown = new Error("db down");
      (prismaMock.task.create as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.create(dto)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });

    it("does not remap explicit DomainError thrown by existence checks", async () => {
      // Ensures decorator preserves already-thrown DomainError (pass-through)
      const dto: TCreateTaskDto = {
        title: "X",
        description: "Y",
        status: "inProgress",
        userId: "missing",
        projectId: "p1",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      await expect(repo.create(dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        message: "Owner user not found",
      });
    });
  });

  describe("findAll", () => {
    it("uses buildTaskWhere with provided filters and returns OffsetPage with defaults", async () => {
      const repo = new TaskRepository();
      const params = {}; // all defaults
      const where = { deletedAt: null };

      // Make the builder deterministic for this test
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      const tasks: PrismaTask[] = [
        {
          id: "t1",
          title: "A",
          description: null,
          status: "OPEN" as any,
          projectId: "p1",
          userId: "u1",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ];
      (prismaMock.task.findMany as unknown as Mock).mockResolvedValueOnce(
        tasks,
      );
      (prismaMock.task.count as unknown as Mock).mockResolvedValueOnce(1);

      const result = await repo.findAll(params as any);

      // Assert builder call
      expect(mocks.buildTaskWhere).toHaveBeenCalledWith({
        q: undefined,
        projectId: undefined,
        userId: undefined,
        status: undefined,
        includeDeleted: false,
      });

      // Assert repository uses the mocked where consistently
      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where,
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      });
      expect(prismaMock.task.count).toHaveBeenCalledWith({ where });

      expect(result).toEqual({
        data: tasks,
        total: 1,
        limit: 20,
        offset: 0,
        sortBy: "createdAt",
        sortDir: "desc",
      });
    });

    it("passes filters to buildTaskWhere and honors pagination/sorting", async () => {
      const repo = new TaskRepository();

      const params = {
        q: "fix",
        projectId: "p1",
        userId: "u1",
        status: "OPEN",
        includeDeleted: true,
        limit: 5,
        offset: 10,
        sortBy: "title",
        sortDir: "asc",
      } as const;

      const where = { projectId: "p1", userId: "u1", status: "OPEN" };
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      (prismaMock.task.findMany as unknown as Mock).mockResolvedValueOnce([]);
      (prismaMock.task.count as unknown as Mock).mockResolvedValueOnce(0);

      const result = await repo.findAll(params as any);

      expect(mocks.buildTaskWhere).toHaveBeenCalledWith({
        q: "fix",
        projectId: "p1",
        userId: "u1",
        status: "OPEN",
        includeDeleted: true,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where,
        orderBy: { title: "asc" },
        skip: 10,
        take: 5,
      });
      expect(prismaMock.task.count).toHaveBeenCalledWith({ where });

      expect(result).toEqual({
        data: [],
        total: 0,
        limit: 5,
        offset: 10,
        sortBy: "title",
        sortDir: "asc",
      });
    });

    it("keeps where consistent between findMany and count", async () => {
      const repo = new TaskRepository();

      // Return the exact where you want to assert
      const where = { userId: "u1" };
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      (prismaMock.task.findMany as unknown as Mock).mockResolvedValueOnce([
        { id: "t1" },
      ] as any);
      (prismaMock.task.count as unknown as Mock).mockResolvedValueOnce(1);

      await repo.findAll({ userId: "u1" } as any);

      const findManyArg = (
        prismaMock.task.findMany as unknown as Mock
      ).mock.calls.at(-1)?.[0];
      const countArg = (prismaMock.task.count as unknown as Mock).mock.calls.at(
        -1,
      )?.[0];

      expect(findManyArg.where).toEqual(where);
      expect(countArg.where).toEqual(where);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      // Use the hoisted spy reference if you set it up as in Option A
      const where = {};
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      // PrismaClientValidationError signature differs by version; the single-arg string is supported broadly
      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.task.findMany as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(repo.findAll({ q: "x" })).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const where = {};
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      const unknown = new Error("db down");
      (prismaMock.task.findMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.findAll({})).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });

    it("keeps where consistent between findMany and count", async () => {
      const where = { userId: "u1" };
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      (prismaMock.task.findMany as unknown as Mock).mockResolvedValueOnce([
        { id: "t1" },
      ] as any);
      (prismaMock.task.count as unknown as Mock).mockResolvedValueOnce(1);

      await repo.findAll({ userId: "u1" });

      const findManyArg = (
        prismaMock.task.findMany as unknown as Mock
      ).mock.calls.at(-1)?.[0];
      const countArg = (prismaMock.task.count as unknown as Mock).mock.calls.at(
        -1,
      )?.[0];

      expect(findManyArg.where).toEqual(where);
      expect(countArg.where).toEqual(where);
    });
  });

  describe("findAllCursor", () => {
    it("builds where via buildTaskWhere and uses id tiebreaker for non-id sortBy", async () => {
      const where = { userId: "u1" };
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      const rows: PrismaTask[] = [
        {
          id: "2",
          title: "B",
          status: "OPEN" as any,
          projectId: "p1",
          userId: "u1",
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date(),
        } as any,
        {
          id: "3",
          title: "C",
          status: "OPEN" as any,
          projectId: "p1",
          userId: "u1",
          createdAt: new Date("2024-01-03"),
          updatedAt: new Date(),
        } as any,
        {
          id: "4",
          title: "D",
          status: "OPEN" as any,
          projectId: "p1",
          userId: "u1",
          createdAt: new Date("2024-01-04"),
          updatedAt: new Date(),
        } as any,
      ];
      (prismaMock.task.findMany as unknown as Mock).mockResolvedValueOnce(rows);

      const res = await repo.findAllCursor({
        userId: "u1",
        take: 2,
        sortBy: "createdAt",
        sortDir: "asc",
      } as any);

      expect(mocks.buildTaskWhere).toHaveBeenCalledWith({
        q: undefined,
        projectId: undefined,
        userId: "u1",
        status: undefined,
        includeDeleted: false,
      });
      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 3, // pageSize+1
        skip: undefined,
        cursor: undefined,
      });
      // HasMore since 3 fetched for pageSize=2; next cursor is the last of the first 2
      expect(res.data.map((t) => t.id)).toEqual(["2", "3"]);
      expect(res.nextCursor).toEqual({ id: "3" });
      expect(res.prevCursor).toBeUndefined();
      expect(res.sortBy).toBe("createdAt");
      expect(res.sortDir).toBe("asc");
    });

    it("uses single-field orderBy when sortBy is id", async () => {
      const where = {};
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      (prismaMock.task.findMany as unknown as Mock).mockResolvedValueOnce([
        { id: "a" },
        { id: "b" },
        { id: "c" },
      ] as any);

      const res = await repo.findAllCursor({
        take: 2,
        sortBy: "id",
        sortDir: "asc",
      } as any);

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ id: "asc" }],
        take: 3,
        skip: undefined,
        cursor: undefined,
      });
      expect(res.data.map((r) => r.id)).toEqual(["a", "b"]);
      expect(res.nextCursor).toEqual({ id: "b" });
      expect(res.prevCursor).toBeUndefined();
    });

    it("caps page size at 100 and computes args from take and cursor (forward)", async () => {
      const where = {};
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      (prismaMock.task.findMany as unknown as Mock).mockResolvedValueOnce(
        Array.from({ length: 101 }, (_, i) => ({ id: String(100 + i) })) as any,
      );

      await repo.findAllCursor({
        take: 999, // should cap to 100
        sortBy: "id",
        sortDir: "desc",
        cursor: { id: "50" },
      } as any);

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ id: "desc" }],
        take: 101, // 100 + 1 extra
        skip: 1,
        cursor: { id: "50" },
      });
    });

    it("supports backward pagination (take negative): reverses rows and sets prevCursor only", async () => {
      const where = {};
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      const rows = [{ id: "30" }, { id: "20" }, { id: "10" }]; // returned in db order (desc for example)
      (prismaMock.task.findMany as unknown as Mock).mockResolvedValueOnce(
        rows as any,
      );

      const res = await repo.findAllCursor({
        take: -2,
        sortBy: "id",
        sortDir: "desc",
        cursor: { id: "40" },
      } as any);

      // For backward, take becomes -(pageSize+1) and then results are reversed for normalization
      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ id: "desc" }],
        take: -3,
        skip: 1,
        cursor: { id: "40" },
      });

      // rows reversed -> ["10", "20", "30"], pageSize=2 => data ["10", "20"], hasMore true => prevCursor from first item
      expect(res.data.map((r) => r.id)).toEqual(["10", "20"]);
      expect(res.prevCursor).toEqual({ id: "10" });
      expect(res.nextCursor).toBeUndefined();
    });

    it("no hasMore when fetched <= pageSize (forward)", async () => {
      const where = {};
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      (prismaMock.task.findMany as unknown as Mock).mockResolvedValueOnce([
        { id: "1" },
      ] as any);

      const res = await repo.findAllCursor({
        take: 2,
        sortBy: "id",
        sortDir: "asc",
      } as any);

      expect(res.data.map((r) => r.id)).toEqual(["1"]);
      expect(res.nextCursor).toBeUndefined();
      expect(res.prevCursor).toBeUndefined();
    });

    it("propagates Prisma validation errors via decorator/mapper", async () => {
      const where = {};
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.task.findMany as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(
        repo.findAllCursor({ take: 2, sortBy: "id", sortDir: "asc" } as any),
      ).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const where = {};
      mocks.buildTaskWhere.mockReturnValueOnce(where);

      const unknown = new Error("db down");
      (prismaMock.task.findMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(
        repo.findAllCursor({ take: 2, sortBy: "id", sortDir: "asc" } as any),
      ).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("markAsCompleted", () => {
    it("updates status to 'done' and sets updatedAt to completedAt", async () => {
      const taskId = "t1";
      const completedAt = new Date("2024-01-01T00:00:00.000Z");

      (prismaMock.task.update as unknown as Mock).mockResolvedValueOnce({}); // result ignored

      await repo.markAsCompleted(taskId, completedAt);

      expect(prismaMock.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: { status: "done", updatedAt: completedAt },
      });
    });

    it("maps P2025 (not found) to DomainError NOT_FOUND 404", async () => {
      const taskId = "missing";
      const completedAt = new Date();

      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.task.update as unknown as Mock).mockRejectedValueOnce(p2025);

      await expect(
        repo.markAsCompleted(taskId, completedAt),
      ).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
        message: "Resource not found",
        cause: p2025,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const taskId = "t1";
      const completedAt = new Date();
      const unknown = new Error("db down");

      (prismaMock.task.update as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(
        repo.markAsCompleted(taskId, completedAt),
      ).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("update", () => {
    it("throws DomainError NOT_FOUND when user does not exist", async () => {
      const dto: TUpdateTaskDto = {
        userId: "u-missing",
        projectId: "p1",
        title: "T",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      await expect(repo.update("t1", dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        message: "User not found",
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u-missing" },
      });
      expect(prismaMock.project.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.task.update).not.toHaveBeenCalled();
    });

    it("throws DomainError NOT_FOUND when project does not exist", async () => {
      const dto: TUpdateTaskDto = {
        userId: "u1",
        projectId: "p-missing",
        title: "T",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "u1",
      } as PrismaUser);
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      await expect(repo.update("t1", dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        message: "Project not found",
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
      });
      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: "p-missing" },
      });
      expect(prismaMock.task.update).not.toHaveBeenCalled();
    });

    it("updates with dto data and select projection; returns selected fields", async () => {
      const taskId = "t1";
      const dto: TUpdateTaskDto = {
        title: "New",
        description: "Desc",
        status: "OPEN" as any,
        userId: "u1",
        projectId: "p1",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "u1",
      } as PrismaUser);
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "p1",
      } as PrismaProject);

      const selected = {
        id: taskId,
        title: "New",
        description: "Desc",
        status: "OPEN",
        userId: "u1",
        projectId: "p1",
        updatedAt: new Date(),
      };

      (prismaMock.task.update as unknown as Mock).mockResolvedValueOnce(
        selected,
      );

      const res = await repo.update(taskId, dto);

      expect(prismaMock.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: dto,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          userId: true,
          projectId: true,
          updatedAt: true,
        },
      });
      expect(res).toEqual(selected);
    });

    it("maps P2025 (record to update not found) to DomainError NOT_FOUND 404", async () => {
      const taskId = "missing";
      const dto: TUpdateTaskDto = { title: "X", userId: "u1", projectId: "p1" };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "u1",
      } as PrismaUser);
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "p1",
      } as PrismaProject);

      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.task.update as unknown as Mock).mockRejectedValueOnce(p2025);

      await expect(repo.update(taskId, dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
        message: "Resource not found",
        cause: p2025,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const taskId = "t1";
      const dto: TUpdateTaskDto = { title: "X", userId: "u1", projectId: "p1" };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "u1",
      } as PrismaUser);
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "p1",
      } as PrismaProject);

      const unknown = new Error("db down");
      (prismaMock.task.update as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.update(taskId, dto)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("softDelete", () => {
    it("updates deletedAt when not already soft-deleted; returns true when count>0", async () => {
      const taskId = "t1";
      const when = new Date("2024-01-01T00:00:00Z");

      (prismaMock.task.updateMany as unknown as Mock).mockResolvedValueOnce({
        count: 1,
      });

      const result = await repo.softDelete(taskId, when);

      expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
        where: { id: taskId, deletedAt: null },
        data: { deletedAt: when },
      });
      expect(result).toBe(true);
    });

    it("returns false when already soft-deleted or record missing (count=0)", async () => {
      const taskId = "t2";
      const when = new Date("2024-01-02T00:00:00Z");

      (prismaMock.task.updateMany as unknown as Mock).mockResolvedValueOnce({
        count: 0,
      });

      const result = await repo.softDelete(taskId, when);

      expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
        where: { id: taskId, deletedAt: null },
        data: { deletedAt: when },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const taskId = "t3";
      const when = new Date();

      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.task.updateMany as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(repo.softDelete(taskId, when)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const taskId = "t4";
      const when = new Date();
      const unknown = new Error("db down");

      (prismaMock.task.updateMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.softDelete(taskId, when)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("hardDelete", () => {
    it("calls deleteMany with where.id and returns true when count>0", async () => {
      (prismaMock.task.deleteMany as unknown as Mock).mockResolvedValueOnce({
        count: 1,
      });

      const result = await repo.hardDelete("t1");

      expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({
        where: { id: "t1" },
      });
      expect(result).toBe(true);
    });

    it("returns false when nothing was deleted (idempotent)", async () => {
      (prismaMock.task.deleteMany as unknown as Mock).mockResolvedValueOnce({
        count: 0,
      });

      const result = await repo.hardDelete("missing");

      expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({
        where: { id: "missing" },
      });
      expect(result).toBe(false);
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500 via mapper", async () => {
      const unknown = new Error("db down");
      (prismaMock.task.deleteMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.hardDelete("t1")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("exists", () => {
    it("delegates to findUnique with where.id and select.id, returns true when row exists", async () => {
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "t1",
      });

      const result = await repo.exists("t1");

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: { id: "t1" },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it("returns false when findUnique returns null", async () => {
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repo.exists("missing");

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: { id: "missing" },
        select: { id: true },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.task.findUnique as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(repo.exists("x")).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const unknown = new Error("db down");
      (prismaMock.task.findUnique as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

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
      const taskId = "t1";
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce({
        deletedAt: new Date("2024-01-01T00:00:00Z"),
      });

      const result = await repo.isSoftDeleted(taskId);

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
        select: { deletedAt: true },
      });
      expect(result).toBe(true);
    });

    it("returns false when row exists but deletedAt is null", async () => {
      const taskId = "t2";
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce({
        deletedAt: null,
      });

      const result = await repo.isSoftDeleted(taskId);

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
        select: { deletedAt: true },
      });
      expect(result).toBe(false);
    });

    it("returns false when row is not found", async () => {
      const taskId = "missing";
      (prismaMock.task.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repo.isSoftDeleted(taskId);

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
        select: { deletedAt: true },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const taskId = "boom";
      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.task.findUnique as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(repo.isSoftDeleted(taskId)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const taskId = "boom2";
      const unknown = new Error("db down");
      (prismaMock.task.findUnique as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.isSoftDeleted(taskId)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });
});
