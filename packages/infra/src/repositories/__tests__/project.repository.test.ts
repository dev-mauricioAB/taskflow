import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { Project as PrismaProject } from "@prisma/client";
import { prismaMock } from "../../database/__mocks__/prisma";

const mocks = vi.hoisted(() => ({
  buildProjectWhere: vi.fn(),
}));

// Ensure repository uses the mocked prisma
vi.mock("../../database/prisma.client", () => ({
  prisma: prismaMock,
}));

vi.mock("../helpers", () => ({
  buildProjectWhere: mocks.buildProjectWhere,
}));

// Use the real error mapper so the decorator path is exercised end-to-end
vi.mock("../../database/prisma-error-mapper", async (orig) => {
  const real =
    await orig<typeof import("../../database/prisma-error-mapper")>();
  return { ...real };
});

import { Prisma, User as PrismaUser } from "@prisma/client";
import { ProjectRepository } from "../project.repository";
import {
  CursorListParams,
  ERROR_CODES,
  OffsetListParams,
  ProjectSortBy,
  TCreateProjectDto,
  TUpdateProjectDto,
} from "@repo/shared";
import { ProjectFilters } from "../../interfaces";

describe("ProjectRepository", () => {
  let repo: ProjectRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ProjectRepository();
  });

  describe("findById", () => {
    it("delegates to prisma.project.findUnique with where.id and returns the project", async () => {
      const id = "proj-123";
      const project = {
        id,
        name: "My Project",
        createdAt: new Date(),
        updatedAt: new Date(),
        // add any required fields from your schema
      } as unknown as PrismaProject;

      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce(
        project,
      );

      const result = await repo.findById(id);

      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toBe(project);
    });

    it("returns null when project is not found", async () => {
      const id = "missing";
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repo.findById(id);

      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
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
      (prismaMock.project.findUnique as unknown as Mock).mockRejectedValueOnce(
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
      (prismaMock.project.findUnique as unknown as Mock).mockRejectedValueOnce(
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
    it("updates when project.id is present with only mutable fields", async () => {
      const project = {
        id: "p1",
        name: "New Name",
        description: "New Desc",
        ownerId: "u1",
        // any other fields on your model are ignored by save() for update
      } as unknown as PrismaProject;

      (prismaMock.project.update as unknown as Mock).mockResolvedValueOnce({});

      await repo.save(project);

      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: {
          name: "New Name",
          description: "New Desc",
          ownerId: "u1",
        },
      });
      expect(prismaMock.project.create).not.toHaveBeenCalled();
    });

    it("creates when project.id is absent with the specified creatable fields", async () => {
      const project = {
        name: "Proj",
        description: "Desc",
        ownerId: "u1",
      } as Partial<PrismaProject> as PrismaProject;

      (prismaMock.project.create as unknown as Mock).mockResolvedValueOnce({});

      await repo.save(project);

      expect(prismaMock.project.create).toHaveBeenCalledWith({
        data: {
          name: "Proj",
          description: "Desc",
          ownerId: "u1",
        },
      });
      expect(prismaMock.project.update).not.toHaveBeenCalled();
    });

    it("maps unique constraint (P2002) on create to DomainError 409", async () => {
      const project = {
        name: "Duplicate",
        description: "Desc",
        ownerId: "u1",
      } as Partial<PrismaProject> as PrismaProject;

      const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["Project_unique_field"] }, // adjust if needed
      });
      (prismaMock.project.create as unknown as Mock).mockRejectedValueOnce(
        p2002,
      );

      await expect(repo.save(project)).rejects.toMatchObject({
        name: "DomainError",
        // If your mapper uses a general conflict code for projects, set it here.
        // If you chose a specific code (like NAME_IN_USE), assert that instead.
        // For many setups, P2002 → CONFLICT; for your users it was EMAIL_IN_USE.
        // Align with your mapper’s P2002 branch for projects:
        code: ERROR_CODES.EMAIL_IN_USE,
        status: 409,
      });
    });

    it("maps unique constraint (P2002) on update to DomainError 409", async () => {
      const project = {
        id: "p1",
        name: "Duplicate",
        description: "Desc",
        ownerId: "u1",
      } as unknown as PrismaProject;

      const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["Project_unique_field"] },
      });
      (prismaMock.project.update as unknown as Mock).mockRejectedValueOnce(
        p2002,
      );

      await expect(repo.save(project)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.EMAIL_IN_USE, // or your project-specific code if configured
        status: 409,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const project = {
        name: "X",
        description: "Y",
        ownerId: "u1",
      } as Partial<PrismaProject> as PrismaProject;

      const unknown = new Error("db down");
      (prismaMock.project.create as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.save(project)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("delete", () => {
    it("calls prisma.project.delete with where.id", async () => {
      (prismaMock.project.delete as unknown as Mock).mockResolvedValueOnce({}); // result ignored by method

      await repo.delete("proj-1");

      expect(prismaMock.project.delete).toHaveBeenCalledWith({
        where: { id: "proj-1" },
      });
    });

    it("maps P2025 (record not found) to DomainError NOT_FOUND 404", async () => {
      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.project.delete as unknown as Mock).mockRejectedValueOnce(
        p2025,
      );

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
      (prismaMock.project.delete as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.delete("proj-1")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("create", () => {
    it("throws DomainError NOT_FOUND when owner user does not exist", async () => {
      const dto: TCreateProjectDto = {
        ownerId: "u-missing",
        name: "  Name  ",
        description: "  Desc  ",
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
      expect(prismaMock.project.create).not.toHaveBeenCalled();
    });

    it("trims name and description and creates project", async () => {
      const dto: TCreateProjectDto = {
        ownerId: "u1",
        name: "  My Project  ",
        description: "  Some desc  ",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "u1",
      } as PrismaUser);

      const created: PrismaProject = {
        id: "p1",
        ownerId: "u1",
        name: "My Project",
        description: "Some desc",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      (prismaMock.project.create as unknown as Mock).mockResolvedValueOnce(
        created,
      );

      const result = await repo.create(dto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
      });
      expect(prismaMock.project.create).toHaveBeenCalledWith({
        data: {
          ownerId: "u1",
          name: "My Project",
          description: "Some desc",
        },
      });
      expect(result).toBe(created);
    });

    it("handles undefined/nullable description safely (optional chaining trim)", async () => {
      const dto: TCreateProjectDto = {
        ownerId: "u1",
        name: "  Title  ",
        description: undefined,
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "u1",
      } as PrismaUser);
      (prismaMock.project.create as unknown as Mock).mockResolvedValueOnce({
        id: "p1",
      });

      await repo.create(dto);

      const arg = (prismaMock.project.create as unknown as Mock).mock.calls.at(
        -1,
      )?.[0];
      expect(arg.data).toMatchObject({
        ownerId: "u1",
        name: "Title",
      });
      // description key exists and is undefined due to optional chaining
      expect(
        Object.prototype.hasOwnProperty.call(arg.data, "description"),
      ).toBe(true);
      expect(arg.data.description).toBeUndefined();
    });

    it("maps unique constraint (P2002) to DomainError 409 (adjust expected code to your mapper)", async () => {
      const dto: TCreateProjectDto = {
        ownerId: "u1",
        name: "Duplicate",
        description: "x",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "u1",
      } as PrismaUser);

      const p2002 = new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "x",
        meta: { target: ["Project_unique_field"] }, // adapt to your schema
      });
      (prismaMock.project.create as unknown as Mock).mockRejectedValueOnce(
        p2002,
      );

      await expect(repo.create(dto)).rejects.toMatchObject({
        name: "DomainError",
        // Use the code your mapper returns for project P2002.
        // If generic: CONFLICT. If specific (e.g., NAME_IN_USE), change accordingly.
        code: ERROR_CODES.EMAIL_IN_USE,
        status: 409,
      });
    });

    it("maps unexpected errors to INTERNAL_SERVER_ERROR 500 via mapper", async () => {
      const dto: TCreateProjectDto = {
        ownerId: "u1",
        name: "Name",
        description: "Desc",
      };

      (prismaMock.user.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "u1",
      } as PrismaUser);

      const unknown = new Error("db down");
      (prismaMock.project.create as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.create(dto)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });

    it("does not remap explicit DomainError thrown by owner check (pass-through)", async () => {
      const dto: TCreateProjectDto = {
        ownerId: "missing",
        name: "Name",
        description: "Desc",
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
    it("uses buildProjectWhere with defaults and returns OffsetPage", async () => {
      const params: OffsetListParams<ProjectSortBy> & ProjectFilters = {};
      const where = { deletedAt: null };
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      const rows: PrismaProject[] = [
        {
          id: "p1",
          name: "A",
          description: null,
          ownerId: "u1",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ];

      // Simulate $transaction returning [findMany, count]
      (prismaMock.$transaction as unknown as Mock).mockResolvedValueOnce([
        rows,
        1,
      ]);

      const result = await repo.findAll(params);

      expect(mocks.buildProjectWhere).toHaveBeenCalledWith({
        q: undefined,
        ownerId: undefined,
        includeDeleted: false,
      });

      // You can also assert the inner calls directly if your prismaMock records them:
      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: 0,
      });
      expect(prismaMock.project.count).toHaveBeenCalledWith({ where });

      expect(result).toEqual({
        data: rows,
        total: 1,
        limit: 20,
        offset: 0,
        sortBy: "createdAt",
        sortDir: "desc",
      });
    });

    it("passes filters to buildProjectWhere and honors pagination/sorting", async () => {
      const params: OffsetListParams<ProjectSortBy> & ProjectFilters = {
        q: "crm",
        ownerId: "u1",
        includeDeleted: true,
        limit: 5,
        offset: 10,
        sortBy: "name",
        sortDir: "asc",
      };
      const where = { ownerId: "u1" }; // your builder may omit deletedAt when includeDeleted=true
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      (prismaMock.$transaction as unknown as Mock).mockResolvedValueOnce([
        [],
        0,
      ]);

      const result = await repo.findAll(params);

      expect(mocks.buildProjectWhere).toHaveBeenCalledWith({
        q: "crm",
        ownerId: "u1",
        includeDeleted: true,
      });
      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where,
        orderBy: { name: "asc" },
        take: 5,
        skip: 10,
      });
      expect(prismaMock.project.count).toHaveBeenCalledWith({ where });

      expect(result).toEqual({
        data: [],
        total: 0,
        limit: 5,
        offset: 10,
        sortBy: "name",
        sortDir: "asc",
      });
    });

    it("returns empty page when transaction yields no data and total=0", async () => {
      const where = {};
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      (prismaMock.$transaction as unknown as Mock).mockResolvedValueOnce([
        [],
        0,
      ]);

      const res = await repo.findAll({ limit: 1, offset: 0 });

      expect(res.data).toEqual([]);
      expect(res.total).toBe(0);
    });

    it("maps Prisma validation errors via decorator/mapper when transaction rejects", async () => {
      const where = {};
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.$transaction as unknown as Mock).mockRejectedValueOnce(
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
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      const unknown = new Error("db down");
      (prismaMock.$transaction as unknown as Mock).mockRejectedValueOnce(
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
      const where = { ownerId: "u1" };
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      (prismaMock.$transaction as unknown as Mock).mockResolvedValueOnce([
        [{ id: "p1" }],
        1,
      ]);

      await repo.findAll({ ownerId: "u1" });

      // Assert the arguments passed to the inner model calls
      expect(prismaMock.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where }),
      );
      expect(prismaMock.project.count).toHaveBeenCalledWith({ where });
    });
  });

  describe("findAllCursor", () => {
    it("defaults to sortBy 'name' asc and uses id as tiebreaker", async () => {
      const where = { deletedAt: null };
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      const rows: PrismaProject[] = [
        {
          id: "2",
          name: "B",
          ownerId: "u1",
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        {
          id: "3",
          name: "C",
          ownerId: "u1",
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        {
          id: "4",
          name: "D",
          ownerId: "u1",
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ];
      (prismaMock.project.findMany as unknown as Mock).mockResolvedValueOnce(
        rows,
      );

      const res = await repo.findAllCursor(
        {} as CursorListParams<ProjectSortBy>,
      );

      expect(mocks.buildProjectWhere).toHaveBeenCalledWith({
        q: undefined,
        ownerId: undefined,
        includeDeleted: false,
      });

      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 21, // default pageSize=20, so fetch 21
        skip: undefined,
        cursor: undefined,
      });

      // hasMore true -> first 20 returned, but we only provided 3 rows so no hasMore
      expect(res.data.map((p) => p.id)).toEqual(["2", "3", "4"]);
      expect(res.nextCursor).toBeUndefined();
      expect(res.prevCursor).toBeUndefined();
      expect(res.sortBy).toBe("name");
      expect(res.sortDir).toBe("asc");
    });

    it("uses name primary sort and id tie-breaker explicitly", async () => {
      const where = {};
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      (prismaMock.project.findMany as unknown as Mock).mockResolvedValueOnce([
        { id: "a", name: "Alpha" },
        { id: "b", name: "Beta" },
        { id: "c", name: "Gamma" },
      ] as any);

      const res = await repo.findAllCursor({
        sortBy: "name",
        sortDir: "asc",
        take: 2,
      } as CursorListParams<ProjectSortBy>);

      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 3,
        skip: undefined,
        cursor: undefined,
      });
      expect(res.data.map((p) => p.id)).toEqual(["a", "b"]);
      expect(res.nextCursor).toEqual({ id: "b" });
      expect(res.prevCursor).toBeUndefined();
    });

    it("adds stable tie-breakers for non-name sort (e.g., createdAt)", async () => {
      const where = {};
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      (prismaMock.project.findMany as unknown as Mock).mockResolvedValueOnce([
        { id: "1", name: "A", createdAt: new Date("2024-01-01") },
        { id: "2", name: "A", createdAt: new Date("2024-01-02") },
        { id: "3", name: "B", createdAt: new Date("2024-01-03") },
      ] as any);

      await repo.findAllCursor({
        sortBy: "createdAt",
        sortDir: "asc",
        take: 2,
      } as CursorListParams<ProjectSortBy>);

      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ createdAt: "asc" }, { name: "asc" }, { id: "asc" }],
        take: 3,
        skip: undefined,
        cursor: undefined,
      });
    });

    it("applies cursor and caps page size at 100 (forward)", async () => {
      const where = {};
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      (prismaMock.project.findMany as unknown as Mock).mockResolvedValueOnce(
        Array.from({ length: 101 }, (_, i) => ({
          id: String(100 + i),
          name: `N${i}`,
        })) as any,
      );

      await repo.findAllCursor({
        take: 999, // cap to 100
        cursor: { id: "50" },
        sortBy: "name",
        sortDir: "desc",
      } as CursorListParams<ProjectSortBy>);

      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ name: "desc" }, { id: "desc" }],
        take: 101, // 100 + 1
        skip: 1,
        cursor: { id: "50" },
      });
    });

    it("supports backward pagination (take negative) and emits prevCursor only", async () => {
      const where = {};
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      const rows = [
        { id: "30", name: "Z" },
        { id: "20", name: "Y" },
        { id: "10", name: "X" },
      ];
      (prismaMock.project.findMany as unknown as Mock).mockResolvedValueOnce(
        rows as any,
      );

      const res = await repo.findAllCursor({
        take: -2,
        sortBy: "name",
        sortDir: "desc",
        cursor: { id: "40" },
      } as CursorListParams<ProjectSortBy>);

      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ name: "desc" }, { id: "desc" }],
        take: -3,
        skip: 1,
        cursor: { id: "40" },
      });

      // normalized reverse -> ["10","20","30"], pageSize 2 -> ["10","20"], hasMore true -> prevCursor from first
      expect(res.data.map((p) => p.id)).toEqual(["10", "20"]);
      expect(res.prevCursor).toEqual({ id: "10" });
      expect(res.nextCursor).toBeUndefined();
    });

    it("no hasMore when fetched <= pageSize (forward): emits no cursors", async () => {
      const where = {};
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      (prismaMock.project.findMany as unknown as Mock).mockResolvedValueOnce([
        { id: "1", name: "A" },
      ] as any);

      const res = await repo.findAllCursor({
        take: 2,
        sortBy: "name",
        sortDir: "asc",
      } as CursorListParams<ProjectSortBy>);

      expect(res.data.map((p) => p.id)).toEqual(["1"]);
      expect(res.nextCursor).toBeUndefined();
      expect(res.prevCursor).toBeUndefined();
    });

    it("maps Prisma validation errors via decorator/mapper", async () => {
      const where = {};
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.project.findMany as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(
        repo.findAllCursor({
          take: 2,
          sortBy: "name",
          sortDir: "asc",
        } as CursorListParams<ProjectSortBy>),
      ).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const where = {};
      mocks.buildProjectWhere.mockReturnValueOnce(where);

      const unknown = new Error("db down");
      (prismaMock.project.findMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(
        repo.findAllCursor({
          take: 2,
          sortBy: "name",
          sortDir: "asc",
        } as CursorListParams<ProjectSortBy>),
      ).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("findByOwnerId", () => {
    it("calls prisma.project.findMany with where.ownerId and returns projects", async () => {
      const ownerId = "u1";
      const rows: PrismaProject[] = [
        {
          id: "p1",
          ownerId,
          name: "Proj 1",
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        {
          id: "p2",
          ownerId,
          name: "Proj 2",
          description: "Desc",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ];

      (prismaMock.project.findMany as unknown as Mock).mockResolvedValueOnce(
        rows,
      );

      const result = await repo.findByOwnerId(ownerId);

      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where: { ownerId },
      });
      expect(result).toEqual(rows);
    });

    it("returns empty array when no projects match", async () => {
      const ownerId = "u-empty";
      (prismaMock.project.findMany as unknown as Mock).mockResolvedValueOnce(
        [],
      );

      const result = await repo.findByOwnerId(ownerId);

      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where: { ownerId },
      });
      expect(result).toEqual([]);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const ownerId = "boom";
      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.project.findMany as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(repo.findByOwnerId(ownerId)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const ownerId = "boom2";
      const unknown = new Error("db down");
      (prismaMock.project.findMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.findByOwnerId(ownerId)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("softDelete", () => {
    it("updates deletedAt when not already soft-deleted and returns true (count>0)", async () => {
      const projectId = "p1";
      const when = new Date("2024-01-01T00:00:00Z");

      (prismaMock.project.updateMany as unknown as Mock).mockResolvedValueOnce({
        count: 1,
      });

      const result = await repo.softDelete(projectId, when);

      expect(prismaMock.project.updateMany).toHaveBeenCalledWith({
        where: { id: projectId, deletedAt: null },
        data: { deletedAt: when },
      });
      expect(result).toBe(true);
    });

    it("returns false when already soft-deleted or not found (count=0)", async () => {
      const projectId = "p2";
      const when = new Date("2024-01-02T00:00:00Z");

      (prismaMock.project.updateMany as unknown as Mock).mockResolvedValueOnce({
        count: 0,
      });

      const result = await repo.softDelete(projectId, when);

      expect(prismaMock.project.updateMany).toHaveBeenCalledWith({
        where: { id: projectId, deletedAt: null },
        data: { deletedAt: when },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const projectId = "p3";
      const when = new Date();

      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.project.updateMany as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(repo.softDelete(projectId, when)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const projectId = "p4";
      const when = new Date();
      const unknown = new Error("db down");

      (prismaMock.project.updateMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.softDelete(projectId, when)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("hardDelete", () => {
    it("calls deleteMany with where.id and returns true when count>0", async () => {
      (prismaMock.project.deleteMany as unknown as Mock).mockResolvedValueOnce({
        count: 1,
      });

      const result = await repo.hardDelete("p1");

      expect(prismaMock.project.deleteMany).toHaveBeenCalledWith({
        where: { id: "p1" },
      });
      expect(result).toBe(true);
    });

    it("returns false when nothing was deleted (idempotent)", async () => {
      (prismaMock.project.deleteMany as unknown as Mock).mockResolvedValueOnce({
        count: 0,
      });

      const result = await repo.hardDelete("missing");

      expect(prismaMock.project.deleteMany).toHaveBeenCalledWith({
        where: { id: "missing" },
      });
      expect(result).toBe(false);
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500 via mapper", async () => {
      const unknown = new Error("db down");
      (prismaMock.project.deleteMany as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.hardDelete("p1")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("exists", () => {
    it("delegates to findUnique with where.id and select.id; returns true when row exists", async () => {
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce({
        id: "p1",
      });

      const result = await repo.exists("p1");

      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: "p1" },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it("returns false when row is not found", async () => {
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repo.exists("missing");

      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: "missing" },
        select: { id: true },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.project.findUnique as unknown as Mock).mockRejectedValueOnce(
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
      (prismaMock.project.findUnique as unknown as Mock).mockRejectedValueOnce(
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
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce({
        deletedAt: new Date("2024-01-01T00:00:00Z"),
      });

      const result = await repo.isSoftDeleted("p1");

      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: "p1" },
        select: { deletedAt: true },
      });
      expect(result).toBe(true);
    });

    it("returns false when row exists but deletedAt is null", async () => {
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce({
        deletedAt: null,
      });

      const result = await repo.isSoftDeleted("p2");

      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: "p2" },
        select: { deletedAt: true },
      });
      expect(result).toBe(false);
    });

    it("returns false when row is not found", async () => {
      (prismaMock.project.findUnique as unknown as Mock).mockResolvedValueOnce(
        null,
      );

      const result = await repo.isSoftDeleted("missing");

      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: "missing" },
        select: { deletedAt: true },
      });
      expect(result).toBe(false);
    });

    it("maps Prisma validation errors via decorator/mapper and throws DomainError", async () => {
      const validation = new Prisma.PrismaClientValidationError("validation", {
        clientVersion: "",
      });
      (prismaMock.project.findUnique as unknown as Mock).mockRejectedValueOnce(
        validation,
      );

      await expect(repo.isSoftDeleted("boom")).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.VALIDATION_FAILED,
        message: "Invalid input data",
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const unknown = new Error("db down");
      (prismaMock.project.findUnique as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.isSoftDeleted("boom2")).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });

  describe("update", () => {
    it("updates with dto and select projection; returns selected fields", async () => {
      const projectId = "p1";
      const dto: TUpdateProjectDto = {
        name: "New Name",
        description: "New Desc",
        // ownerId: "u2",
      };

      const updated = {
        id: projectId,
        name: "New Name",
        description: "New Desc",
        // ownerId: "u2",
        updatedAt: new Date(),
      };

      (prismaMock.project.update as unknown as Mock).mockResolvedValueOnce(
        updated,
      );

      const res = await repo.update(projectId, dto);

      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: dto,
        select: {
          id: true,
          name: true,
          description: true,
          ownerId: true,
          updatedAt: true,
        },
      });
      expect(res).toEqual(updated);
    });

    it("maps P2025 (record to update not found) to DomainError NOT_FOUND 404", async () => {
      const projectId = "missing";
      const dto: TUpdateProjectDto = { name: "X" };

      const p2025 = new Prisma.PrismaClientKnownRequestError("not found", {
        code: "P2025",
        clientVersion: "x",
      });
      (prismaMock.project.update as unknown as Mock).mockRejectedValueOnce(
        p2025,
      );

      await expect(repo.update(projectId, dto)).rejects.toMatchObject({
        name: "DomainError",
        code: ERROR_CODES.NOT_FOUND,
        status: 404,
        message: "Resource not found",
        cause: p2025,
      });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR 500", async () => {
      const projectId = "p1";
      const dto: TUpdateProjectDto = { name: "X" };

      const unknown = new Error("db down");
      (prismaMock.project.update as unknown as Mock).mockRejectedValueOnce(
        unknown,
      );

      await expect(repo.update(projectId, dto)).rejects.toMatchObject({
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        status: 500,
        message: "Unexpected database error",
        cause: unknown,
      });
    });
  });
});
