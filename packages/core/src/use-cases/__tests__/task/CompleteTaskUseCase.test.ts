import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { ITaskRepository, IEventPublisher } from "@repo/infra";
import type { Task } from "@repo/shared";
import { TASK_COMPLETED } from "@repo/shared";
import { CompleteTaskUseCase } from "../../task";

function makeTasks(): Mocked<ITaskRepository> {
  return {
    findById: vi.fn(),
    markAsCompleted: vi.fn(),
    // add stubs for other methods if your interface requires them at compile time
  } as unknown as Mocked<ITaskRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("CompleteTaskUseCase", () => {
  let tasks: Mocked<ITaskRepository>;
  let events: Mocked<IEventPublisher>;
  let uc: CompleteTaskUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    tasks = makeTasks();
    events = makeEvents();
    uc = new CompleteTaskUseCase(tasks, events);
  });

  it("returns early when task is not found (no update, no event)", async () => {
    tasks.findById.mockResolvedValueOnce(null);

    await uc.execute("missing-id");

    expect(tasks.findById).toHaveBeenCalledWith("missing-id");
    expect(tasks.markAsCompleted).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("is idempotent: when already done, does not update or publish", async () => {
    const t: Task = {
      id: "t1",
      title: "Test",
      status: "done",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
      projectId: "p1",
      userId: "u1",
      description: null as any,
      dueAt: null as any,
      completedAt: new Date("2024-01-01T00:00:00Z") as any,
    } as Task;

    tasks.findById.mockResolvedValueOnce(t);

    await uc.execute("t1");

    expect(tasks.findById).toHaveBeenCalledWith("t1");
    expect(tasks.markAsCompleted).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("marks as completed and publishes TASK_COMPLETED with provided completedAt", async () => {
    const base: Task = {
      id: "t2",
      title: "Do it",
      status: "todo",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
      projectId: "p1",
      userId: "u1",
      description: null as any,
      dueAt: null as any,
      completedAt: null as any,
    } as Task;

    tasks.findById.mockResolvedValueOnce(base);

    const completedAt = new Date("2024-02-02T03:04:05.006Z");

    await uc.execute("t2", completedAt);

    expect(tasks.findById).toHaveBeenCalledWith("t2");
    expect(tasks.markAsCompleted).toHaveBeenCalledWith("t2", completedAt);

    expect(events.publish).toHaveBeenCalledWith(TASK_COMPLETED, {
      taskId: "t2",
      completedAt: completedAt.toISOString(),
    });
  });

  it("uses current time when completedAt is not provided and publishes with that ISO", async () => {
    const t: Task = {
      id: "t3",
      title: "Auto time",
      status: "inProgress",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
      projectId: "p1",
      userId: "u1",
      description: null as any,
      dueAt: null as any,
      completedAt: null as any,
    } as Task;

    tasks.findById.mockResolvedValueOnce(t);

    const fixed = new Date("2024-06-01T10:20:30.000Z");
    vi.setSystemTime(fixed);

    await uc.execute("t3");

    // markAsCompleted receives the same Date used for event payload
    const passedDate = (tasks.markAsCompleted.mock.calls[0]?.[1]) as Date;
    expect(passedDate).toEqual(fixed);

    expect(events.publish).toHaveBeenCalledWith(TASK_COMPLETED, {
      taskId: "t3",
      completedAt: fixed.toISOString(),
    });

    vi.useRealTimers();
  });

  it("propagates errors from findById", async () => {
    const err = new Error("db down");
    tasks.findById.mockRejectedValueOnce(err);

    await expect(uc.execute("t4")).rejects.toBe(err);

    expect(tasks.markAsCompleted).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("propagates errors from markAsCompleted and does not publish", async () => {
    const t: Task = {
      id: "t5",
      title: "Err",
      status: "todo",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
      projectId: "p1",
      userId: "u1",
      description: null as any,
      dueAt: null as any,
      completedAt: null as any,
    } as Task;

    tasks.findById.mockResolvedValueOnce(t);
    const err = new Error("cannot update");
    tasks.markAsCompleted.mockRejectedValueOnce(err);

    await expect(uc.execute("t5")).rejects.toBe(err);

    expect(events.publish).not.toHaveBeenCalled();
  });
});
