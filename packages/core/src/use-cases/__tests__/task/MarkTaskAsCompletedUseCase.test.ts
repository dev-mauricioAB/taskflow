import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { ITaskRepository, IEventPublisher } from "@repo/infra";
import { TASK_COMPLETED } from "@repo/shared";
import { MarkTaskAsCompletedUseCase } from "../../task";

function makeTasks(): Mocked<ITaskRepository> {
  return {
    markAsCompleted: vi.fn(),
  } as unknown as Mocked<ITaskRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("MarkTaskAsCompletedUseCase", () => {
  let tasks: Mocked<ITaskRepository>;
  let events: Mocked<IEventPublisher>;
  let uc: MarkTaskAsCompletedUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    tasks = makeTasks();
    events = makeEvents();
    uc = new MarkTaskAsCompletedUseCase(tasks, events);
  });

  it("marks as completed with current time and publishes TASK_COMPLETED using the same ISO", async () => {
    const fixed = new Date("2024-07-01T09:30:45.123Z");
    vi.setSystemTime(fixed);

    tasks.markAsCompleted.mockResolvedValueOnce(undefined as any);

    const result = await uc.execute({ taskId: "t1" });

    // repo receives the exact Date used by use case
    const passedDate = tasks.markAsCompleted.mock.calls[0]?.[1] as Date;
    expect(passedDate).toEqual(fixed);

    // event payload uses the same time in ISO
    expect(events.publish).toHaveBeenCalledWith(TASK_COMPLETED, {
      taskId: "t1",
      completedAt: fixed.toISOString(),
    });

    expect(result).toEqual({ success: true });

    vi.useRealTimers();
  });

  it("propagates repository errors and does not publish", async () => {
    const err = new Error("db down");
    tasks.markAsCompleted.mockRejectedValueOnce(err);

    await expect(uc.execute({ taskId: "t2" })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });
});
