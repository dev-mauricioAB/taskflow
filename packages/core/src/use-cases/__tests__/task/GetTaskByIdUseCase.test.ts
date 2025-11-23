import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { TaskRepository } from "@repo/infra";
import type { Task } from "@repo/shared";
import { GetTaskByIdUseCase } from "../../task";

function makeRepo(): Mocked<TaskRepository> {
  return {
    findById: vi.fn(),
    // add stubs for other TaskRepository methods if compile-time requires
  } as unknown as Mocked<TaskRepository>;
}

describe("GetTaskByIdUseCase", () => {
  let repo: Mocked<TaskRepository>;
  let uc: GetTaskByIdUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new GetTaskByIdUseCase(repo);
  });

  it("delegates to repo.findById and returns the task", async () => {
    const task: Task = {
      id: "t1",
      title: "Example",
      status: "todo",
      projectId: "p1",
      userId: "u1",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
      deletedAt: null as any,
      description: null as any,
      dueAt: null as any,
      completedAt: null as any,
    } as Task;

    repo.findById.mockResolvedValueOnce(task);

    const result = await uc.execute({ id: "t1" });

    expect(repo.findById).toHaveBeenCalledWith("t1");
    expect(result).toBe(task);
  });

  it("throws NOT_FOUND DomainError when task is not found", async () => {
    repo.findById.mockResolvedValueOnce(null);

    await expect(uc.execute({ id: "missing" })).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "Task not found",
    });
  });

  it("propagates repository errors without remapping", async () => {
    const err = new Error("db down");
    repo.findById.mockRejectedValueOnce(err);

    await expect(uc.execute({ id: "t1" })).rejects.toBe(err);
  });
});
