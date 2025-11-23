import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { TaskRepository } from "@repo/infra";
import type { TTaskCursorPagination, CursorPage, Task } from "@repo/shared";
import { GetTasksCursorUseCase } from "../../task";

function makeRepo(): Mocked<TaskRepository> {
  return {
    findAllCursor: vi.fn(),
  } as unknown as Mocked<TaskRepository>;
}

describe("GetTasksCursorUseCase", () => {
  let repo: Mocked<TaskRepository>;
  let uc: GetTasksCursorUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new GetTasksCursorUseCase(repo);
  });

  it("parses string take, coerces cursor from string, defaults sortDir asc and sortBy id", async () => {
    const input: TTaskCursorPagination = {
      q: "bug",
      projectId: "p1",
      userId: "u1",
      status: "todo",
      take: "25" as any,       // string -> number
      cursor: "abc123" as any, // string -> { id }
      sortBy: 'id',
      sortDir: 'asc',
      includeDeleted: false
    };

    const page: CursorPage<Task, any> = {
      data: [] as any,
      nextCursor: undefined,
      prevCursor: undefined,
      sortBy: "id",
      sortDir: "asc",
    };
    repo.findAllCursor.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: "bug",
      projectId: "p1",
      userId: "u1",
      status: "todo",
      take: 25,
      cursor: { id: "abc123" },
      includeDeleted: false,
      sortBy: "id",
      sortDir: "asc",
    });
    expect(result).toBe(page);
  });

  it("accepts numeric take and object cursor; honors explicit sortDir and sortBy", async () => {
    const input: TTaskCursorPagination = {
      take: 10,
      cursor: { id: "last" } as any,
      sortDir: "desc",
      sortBy: "createdAt" as any,
      includeDeleted: false
    };

    const page = {
      data: [],
      nextCursor: undefined,
      prevCursor: undefined,
      sortBy: "createdAt",
      sortDir: "desc",
    } as any;
    repo.findAllCursor.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: undefined,
      projectId: undefined,
      userId: undefined,
      status: undefined,
      take: 10,
      cursor: { id: "last" },
      includeDeleted: false,
      sortBy: "createdAt",
      sortDir: "desc",
    });
    expect(result).toBe(page);
  });

  it("defaults take to 20 and omits cursor when not provided", async () => {
    const input = {} as unknown as TTaskCursorPagination;

    const page = { data: [], nextCursor: undefined, prevCursor: undefined, sortBy: "id", sortDir: "asc" } as any;
    repo.findAllCursor.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: undefined,
      projectId: undefined,
      userId: undefined,
      status: undefined,
      take: 20,
      cursor: undefined,
      includeDeleted: false,
      sortBy: "id",
      sortDir: "asc",
    });
    expect(result).toBe(page);
  });

  it("casts includeDeleted to boolean", async () => {
    const input = { includeDeleted: "1" as any } as unknown as TTaskCursorPagination;

    repo.findAllCursor.mockResolvedValueOnce({
      data: [],
      nextCursor: undefined,
      prevCursor: undefined,
      sortBy: "id",
      sortDir: "asc",
    } as any);

    await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith(
      expect.objectContaining({ includeDeleted: true }),
    );
  });

  it("passes through filter fields (projectId, userId, status) as-is", async () => {
    const input: TTaskCursorPagination = {
      q: undefined,
      projectId: "p9",
      userId: "u9",
      status: "inProgress",
      take: "5" as any,
      includeDeleted: false,
      sortBy: 'id',
      sortDir: "asc",
    };

    repo.findAllCursor.mockResolvedValueOnce({
      data: [],
      nextCursor: undefined,
      prevCursor: undefined,
      sortBy: "id",
      sortDir: "asc",
    } as any);

    await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: undefined,
      projectId: "p9",
      userId: "u9",
      status: "inProgress",
      take: 5,
      cursor: undefined,
      includeDeleted: false,
      sortBy: "id",
      sortDir: "asc",
    });
  });

  it("propagates repository errors", async () => {
    const err = new Error("db down");
    repo.findAllCursor.mockRejectedValueOnce(err);

    await expect(uc.execute({ take: 10 } as any)).rejects.toBe(err);
  });
});
