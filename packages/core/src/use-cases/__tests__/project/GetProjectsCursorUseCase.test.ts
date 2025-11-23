import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { ProjectRepository } from "@repo/infra";
import type { TProjectCursorPagination, CursorPage, Project } from "@repo/shared";
import { GetProjectsCursorUseCase } from "../../project";

function makeRepo(): Mocked<ProjectRepository> {
  return {
    findAllCursor: vi.fn(),
  } as unknown as Mocked<ProjectRepository>;
}

describe("GetProjectsCursorUseCase", () => {
  let repo: Mocked<ProjectRepository>;
  let uc: GetProjectsCursorUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new GetProjectsCursorUseCase(repo);
  });

  it("parses string take, coerces cursor from string, defaults sortDir to desc", async () => {
    const input: TProjectCursorPagination = {
      q: "crm",
      ownerId: "u1",
      take: "25" as any,       // "25" -> 25
      cursor: "abc123" as any, // string -> { id }
      // sortDir omitted -> desc
      // sortBy passed through as undefined
    };

    const page: CursorPage<Project, any> = {
      data: [] as any,
      nextCursor: undefined,
      prevCursor: undefined,
      sortBy: undefined,
      sortDir: "desc",
    };
    repo.findAllCursor.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: "crm",
      ownerId: "u1",
      take: 25,
      cursor: { id: "abc123" },
      includeDeleted: false,
      sortBy: undefined,
      sortDir: "desc",
    });
    expect(result).toBe(page);
  });

  it("accepts numeric take and object cursor; honors explicit sortDir and sortBy", async () => {
    const input: TProjectCursorPagination = {
      take: 10,
      cursor: { id: "last" } as any,
      sortDir: "asc",
      sortBy: "name" as any,
      includeDeleted: 1 as any,
      q: undefined,
      ownerId: undefined,
    };

    const page = {
      data: [],
      nextCursor: undefined,
      prevCursor: undefined,
      sortBy: "name",
      sortDir: "asc",
    } as any;
    repo.findAllCursor.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: undefined,
      ownerId: undefined,
      take: 10,
      cursor: { id: "last" },
      includeDeleted: true,
      sortBy: "name",
      sortDir: "asc",
    });
    expect(result).toBe(page);
  });

  it("defaults take to 20 and omits cursor when not provided", async () => {
    const input = {} as unknown as TProjectCursorPagination;

    const page = { data: [], nextCursor: undefined, prevCursor: undefined, sortBy: undefined, sortDir: "desc" } as any;
    repo.findAllCursor.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: undefined,
      ownerId: undefined,
      take: 20,
      cursor: undefined,
      includeDeleted: false,
      sortBy: undefined,
      sortDir: "desc",
    });
    expect(result).toBe(page);
  });

  it("passes filters through untouched (q, ownerId)", async () => {
    const input: TProjectCursorPagination = {
      q: "abc",
      ownerId: "owner-9",
      take: "5" as any,
      sortDir: "asc",
      sortBy: "createdAt" as any,
    };

    repo.findAllCursor.mockResolvedValueOnce({
      data: [],
      nextCursor: undefined,
      prevCursor: undefined,
      sortBy: "createdAt",
      sortDir: "asc",
    } as any);

    await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: "abc",
      ownerId: "owner-9",
      take: 5,
      cursor: undefined,
      includeDeleted: false,
      sortBy: "createdAt",
      sortDir: "asc",
    });
  });

  it("propagates repository errors", async () => {
    const err = new Error("db down");
    repo.findAllCursor.mockRejectedValueOnce(err);

    await expect(uc.execute({ take: 10 } as any)).rejects.toBe(err);
  });
});
