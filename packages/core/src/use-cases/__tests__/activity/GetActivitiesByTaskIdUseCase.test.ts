import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { ActivityRepository } from "@repo/infra";
import type { Activity } from "@repo/shared";
import { GetActivitiesByTaskIdUseCase } from "../../activity";

function makeRepo(): Mocked<ActivityRepository> {
  return {
    findActivityByTaskId: vi.fn(),
  } as unknown as Mocked<ActivityRepository>;
}

describe("GetActivitiesByTaskIdUseCase", () => {
  let repo: Mocked<ActivityRepository>;
  let uc: GetActivitiesByTaskIdUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new GetActivitiesByTaskIdUseCase(repo);
  });

  it("delegates to repo.findActivityByTaskId with params.id and returns activities", async () => {
    const rows: Activity[] = [
      { id: "a1", taskId: "t1", actorId: "u1", type: "comment", message: "m1", createdAt: new Date(), updatedAt: new Date(), deletedAt: null } as any,
      { id: "a2", taskId: "t1", actorId: "u2", type: "updated", message: "m2", createdAt: new Date(), updatedAt: new Date(), deletedAt: null } as any,
    ];

    repo.findActivityByTaskId.mockResolvedValueOnce(rows);

    const result = await uc.execute({ id: "t1" });

    expect(repo.findActivityByTaskId).toHaveBeenCalledWith("t1");
    expect(result).toBe(rows);
  });

  it("returns empty array from repository as-is", async () => {
    repo.findActivityByTaskId.mockResolvedValueOnce([]);

    const result = await uc.execute({ id: "t-empty" });

    expect(repo.findActivityByTaskId).toHaveBeenCalledWith("t-empty");
    expect(result).toEqual([]);
  });

  it("propagates repository errors without remapping", async () => {
    const err = new Error("db down");
    repo.findActivityByTaskId.mockRejectedValueOnce(err);

    await expect(uc.execute({ id: "t1" })).rejects.toBe(err);
  });
});
