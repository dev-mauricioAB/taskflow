import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { ActivityRepository } from "@repo/infra";
import type { Activity, TActivityQueryDto } from "@repo/shared";
import { FindActivitiesUseCase } from "../../activity";

function makeRepo(): Mocked<ActivityRepository> {
  return {
    findMany: vi.fn(),
  } as unknown as Mocked<ActivityRepository>;
}

describe("FindActivitiesUseCase", () => {
  let repo: Mocked<ActivityRepository>;
  let uc: FindActivitiesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new FindActivitiesUseCase(repo);
  });

  it("delegates with all filters when provided", async () => {
    const query: TActivityQueryDto = {
      taskId: "t1",
      actorId: "u1",
      type: "comment",
    } as any;

    const rows: Activity[] = [
      {
        id: "a1",
        taskId: "t1",
        actorId: "u1",
        type: "comment",
        message: "m",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as any,
    ];

    repo.findMany.mockResolvedValueOnce(rows);

    const result = await uc.execute(query);

    expect(repo.findMany).toHaveBeenCalledWith({
      taskId: "t1",
      actorId: "u1",
      type: "comment",
    });
    expect(result).toBe(rows);
  });

  it("delegates when only taskId is provided", async () => {
    repo.findMany.mockResolvedValueOnce([]);

    await uc.execute({ taskId: "t2" } as any);

    expect(repo.findMany).toHaveBeenCalledWith({
      taskId: "t2",
      actorId: undefined,
      type: undefined,
    });
  });

  it("delegates when only actorId is provided", async () => {
    repo.findMany.mockResolvedValueOnce([]);

    await uc.execute({ actorId: "u9" } as any);

    expect(repo.findMany).toHaveBeenCalledWith({
      taskId: undefined,
      actorId: "u9",
      type: undefined,
    });
  });

  it("delegates when only type is provided", async () => {
    repo.findMany.mockResolvedValueOnce([]);

    await uc.execute({ type: "updated" } as any);

    expect(repo.findMany).toHaveBeenCalledWith({
      taskId: undefined,
      actorId: undefined,
      type: "updated",
    });
  });

  it("delegates with undefineds when no filters provided", async () => {
    repo.findMany.mockResolvedValueOnce([]);

    await uc.execute({} as any);

    expect(repo.findMany).toHaveBeenCalledWith({
      taskId: undefined,
      actorId: undefined,
      type: undefined,
    });
  });

  it("propagates repository errors", async () => {
    const err = new Error("db down");
    repo.findMany.mockRejectedValueOnce(err);

    await expect(uc.execute({ taskId: "t1" } as any)).rejects.toBe(err);
  });
});
