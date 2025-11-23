import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { ITaskRepository, IEventPublisher, NewEntity } from "@repo/infra";
import type { Task } from "@repo/shared";
import { TASK_CREATED } from "@repo/shared";
import { CreateTaskUseCase } from "../../task";

function makeTasks(): Mocked<ITaskRepository> {
  return {
    create: vi.fn(),
    findById: vi.fn() as any,
    markAsCompleted: vi.fn() as any,
    update: vi.fn() as any,
    delete: vi.fn() as any,
    softDelete: vi.fn() as any,
    hardDelete: vi.fn() as any,
    exists: vi.fn() as any,
    isSoftDeleted: vi.fn() as any,
    findAll: vi.fn() as any,
    findAllCursor: vi.fn() as any,
  } as unknown as Mocked<ITaskRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("CreateTaskUseCase", () => {
  let tasks: Mocked<ITaskRepository>;
  let events: Mocked<IEventPublisher>;
  let uc: CreateTaskUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    tasks = makeTasks();
    events = makeEvents();
    uc = new CreateTaskUseCase(tasks, events);
  });

  it("rejects when title is missing or blank after trim", async () => {
    await expect(
      uc.execute({ title: "   " } as unknown as NewEntity<Task>),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "VALIDATION_FAILED",
      message: " Task title is required",
    });

    await expect(
      uc.execute({} as unknown as NewEntity<Task>),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "VALIDATION_FAILED",
    });

    expect(tasks.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("creates task and publishes TASK_CREATED with ISO timestamp", async () => {
    const input = {
      title: "Implement feature",
      projectId: "p1",
      userId: "u1",
      description: "Details",
      status: "todo",
    } as unknown as NewEntity<Task>;

    const createdAt = new Date("2024-01-01T12:00:00.000Z");
    vi.setSystemTime(createdAt);

    const created: Task = {
      id: "t1",
      title: "Implement feature",
      projectId: "p1",
      userId: "u1",
      description: "Details",
      status: "todo",
      createdAt,
      updatedAt: createdAt,
      deletedAt: null as any,
      completedAt: null as any,
      dueAt: null as any,
    } as Task;

    tasks.create.mockResolvedValueOnce(created);

    const result = await uc.execute(input);

    // Repository receives the input as-is (no trimming done here beyond the validation check)
    expect(tasks.create).toHaveBeenCalledWith(input);

    // Event emitted with current time ISO and title/id from created entity
    expect(events.publish).toHaveBeenCalledWith(TASK_CREATED, {
      taskId: "t1",
      title: "Implement feature",
      createdAt: createdAt.toISOString(),
    });

    expect(result).toBe(created);

    vi.useRealTimers();
  });

  it("supports title with surrounding spaces (valid after trim) and still uses original input for create", async () => {
    const input = {
      title: "  Do something  ",
      projectId: "p2",
      userId: "u2",
      status: "todo",
    } as unknown as NewEntity<Task>;

    const created: Task = {
      id: "t2",
      title: "  Do something  ",
      projectId: "p2",
      userId: "u2",
      status: "todo",
      createdAt: new Date(),
      updatedAt: new Date(),
      description: null as any,
      deletedAt: null as any,
      completedAt: null as any,
      dueAt: null as any,
    } as Task;

    tasks.create.mockResolvedValueOnce(created);

    await uc.execute(input);

    // The use case only validates via trim; it does not mutate input before passing to repo
    expect(tasks.create).toHaveBeenCalledWith(input);
  });

  it("propagates repository errors and does not publish event on failure", async () => {
    const input = {
      title: "A valid title",
      projectId: "p1",
      userId: "u1",
      status: "todo",
    } as unknown as NewEntity<Task>;

    const err = new Error("db down");
    tasks.create.mockRejectedValueOnce(err);

    await expect(uc.execute(input)).rejects.toBe(err);

    expect(events.publish).not.toHaveBeenCalled();
  });
});
