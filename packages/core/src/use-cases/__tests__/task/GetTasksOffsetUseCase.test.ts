import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { TaskRepository } from "@repo/infra";
import type { TTaskOffsetPagination, OffsetPage, Task } from "@repo/shared";
import { GetTasksOffsetUseCase } from "../../task";

function makeRepo(): Mocked<TaskRepository> {
  return {
    findAll: vi.fn(),
  } as unknown as Mocked<TaskRepository>;
}

describe("GetTasksOffsetUseCase", () => {
  let repo: Mocked<TaskRepository>;
  let uc: GetTasksOffsetUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new GetTasksOffsetUseCase(repo);
  });

  it("defaults limit=20, offset=0, sortBy=createdAt, sortDir=desc when not provided", async () => {
    const input = {} as unknown as TTaskOffsetPagination;

    const page: OffsetPage<Task, any> = {
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
      sortBy: "createdAt",
      sortDir: "desc",
    };
    repo.findAll.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith({
      q: undefined,
      projectId: undefined,
      userId: undefined,
      status: undefined,
      limit: 20,
      offset: 0,
      includeDeleted: false,
      sortBy: "createdAt",
      sortDir: "desc",
    });
    expect(result).toBe(page);
  });

  it("passes numeric limit/offset through and honors explicit sortDir/sortBy", async () => {
    const input: TTaskOffsetPagination = {
      limit: 5,
      offset: 10,
      sortDir: "asc",
      sortBy: "title" as any,
      includeDeleted: false
    };

    const page = {
      data: [],
      total: 0,
      limit: 5,
      offset: 10,
      sortBy: "title",
      sortDir: "asc",
    } as any;
    repo.findAll.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith({
      q: undefined,
      projectId: undefined,
      userId: undefined,
      status: undefined,
      limit: 5,
      offset: 10,
      includeDeleted: false,
      sortBy: "title",
      sortDir: "asc",
    });
    expect(result).toBe(page);
  });

  it("casts includeDeleted to boolean and passes filters through", async () => {
    const input: TTaskOffsetPagination = {
      q: "bug",
      projectId: "p1",
      userId: "u1",
      status: "inProgress",
      includeDeleted: "1" as any,
      limit: 20,
      offset: 0,
      sortBy: "createdAt",
      sortDir: "desc",
    };

    repo.findAll.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
      sortBy: "createdAt",
      sortDir: "desc",
    } as any);

    await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith({
      q: "bug",
      projectId: "p1",
      userId: "u1",
      status: "inProgress",
      limit: 20,
      offset: 0,
      includeDeleted: true,
      sortBy: "createdAt",
      sortDir: "desc",
    });
  });

  it("normalizes invalid sortDir to desc", async () => {
    const input = {
      sortDir: "up" as any,
      sortBy: "createdAt",
    } as unknown as TTaskOffsetPagination;

    repo.findAll.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
      sortBy: "createdAt",
      sortDir: "desc",
    } as any);

    await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ sortDir: "desc" }),
    );
  });

  it("propagates repository errors", async () => {
    const err = new Error("db down");
    repo.findAll.mockRejectedValueOnce(err);

    await expect(uc.execute({ limit: 10, offset: 0 } as any)).rejects.toBe(err);
  });
});
