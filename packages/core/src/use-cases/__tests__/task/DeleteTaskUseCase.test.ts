import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { ITaskRepository, IEventPublisher } from "@repo/infra";
import type { Task } from "@repo/shared";
import { TASK_DELETED } from "@repo/shared";
import { DeleteTaskUseCase } from "../../task";

function makeTasks(): Mocked<ITaskRepository> {
  return {
    findById: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
  } as unknown as Mocked<ITaskRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("DeleteTaskUseCase", () => {
  let tasks: Mocked<ITaskRepository>;
  let events: Mocked<IEventPublisher>;
  let uc: DeleteTaskUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    tasks = makeTasks();
    events = makeEvents();
    uc = new DeleteTaskUseCase(tasks, events);
  });

  it("throws NOT_FOUND when the task does not exist", async () => {
    tasks.findById.mockResolvedValueOnce(null);

    await expect(uc.execute({ taskId: "missing" })).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "Task not found",
    });

    expect(tasks.softDelete).not.toHaveBeenCalled();
    expect(tasks.hardDelete).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("soft-deletes by default and publishes TASK_DELETED with occurredAt ISO", async () => {
    const t: Task = {
      id: "t1",
      title: "X",
      status: "todo",
      projectId: "p1",
      userId: "u1",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
      description: null as any,
      dueAt: null as any,
      completedAt: null as any,
    } as Task;

    const fixed = new Date("2024-01-01T12:00:00.000Z");
    vi.setSystemTime(fixed);

    tasks.findById.mockResolvedValueOnce(t);
    tasks.softDelete.mockResolvedValueOnce(true);

    await uc.execute({ taskId: "t1" });

    // soft path: calls softDelete with a Date close to "now"
    const dateArg = tasks.softDelete.mock.calls[0]?.[1] as Date;
    expect(dateArg).toEqual(fixed);

    expect(events.publish).toHaveBeenCalledWith(TASK_DELETED, {
      taskId: "t1",
      occurredAt: fixed.toISOString(),
    });

    expect(tasks.hardDelete).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("hard-deletes when hard=true and publishes event; does not call softDelete", async () => {
    const t = { id: "t2" } as Task;
    tasks.findById.mockResolvedValueOnce(t);
    tasks.hardDelete.mockResolvedValueOnce(true);

    const fixed = new Date("2024-02-02T00:00:00.000Z");
    vi.setSystemTime(fixed);

    await uc.execute({ taskId: "t2", hard: true });

    expect(tasks.hardDelete).toHaveBeenCalledWith("t2");
    expect(tasks.softDelete).not.toHaveBeenCalled();

    expect(events.publish).toHaveBeenCalledWith(TASK_DELETED, {
      taskId: "t2",
      occurredAt: fixed.toISOString(),
    });

    vi.useRealTimers();
  });

  it("propagates repository errors from findById", async () => {
    const err = new Error("db down");
    tasks.findById.mockRejectedValueOnce(err);

    await expect(uc.execute({ taskId: "t3" })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("propagates repository errors from softDelete and does not publish", async () => {
    tasks.findById.mockResolvedValueOnce({ id: "t4" } as any);
    const err = new Error("cannot soft delete");
    tasks.softDelete.mockRejectedValueOnce(err);

    await expect(uc.execute({ taskId: "t4" })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("propagates repository errors from hardDelete and does not publish", async () => {
    tasks.findById.mockResolvedValueOnce({ id: "t5" } as any);
    const err = new Error("cannot hard delete");
    tasks.hardDelete.mockRejectedValueOnce(err);

    await expect(uc.execute({ taskId: "t5", hard: true })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });
});
