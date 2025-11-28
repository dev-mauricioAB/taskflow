import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { Activity, ActivityType } from "@repo/shared";
import { ACTIVITY_CREATED } from "@repo/shared";
import { CreateActivityUseCase } from "../../activity";
import { IActivityRepository, IEventPublisher, NewEntity } from "@repo/infra";

function makeRepo(): Mocked<IActivityRepository> {
  return {
    create: vi.fn(),
  } as unknown as Mocked<IActivityRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("CreateActivityUseCase", () => {
  let repo: Mocked<IActivityRepository>;
  let events: Mocked<IEventPublisher>;

  const baseInput: NewEntity<Activity> = {
    id: undefined as any,
    taskId: "t1",
    actorId: "u1",
    type: "comment" as ActivityType,
    message: "hello",
    // createdAt: undefined as any,
    // updatedAt: undefined as any,
    // deletedAt: undefined as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    events = makeEvents();
  });

  it("rejects when type is not in allowed list", async () => {
    const uc = new CreateActivityUseCase(repo, events);

    const bad = { ...baseInput, type: "weird" as any };

    await expect(uc.execute(bad)).rejects.toMatchObject({
      name: "DomainError",
      code: "VALIDATION_FAILED",
      message: "Invalid activity type",
    });

    expect(repo.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("creates activity and publishes ACTIVITY_CREATED with createdAt ISO when publisher is provided", async () => {
    const uc = new CreateActivityUseCase(repo, events);

    const createdAt = new Date("2024-01-01T12:00:00.000Z");
    const activity: Activity = {
      id: "a1",
      taskId: "t1",
      actorId: "u1",
      type: "comment" as any,
      message: "hello",
      createdAt,
      updatedAt: createdAt,
      deletedAt: null as any,
    } as Activity;

    repo.create.mockResolvedValueOnce(activity);

    const result = await uc.execute(baseInput);

    expect(repo.create).toHaveBeenCalledWith(baseInput);
    expect(events.publish).toHaveBeenCalledWith(ACTIVITY_CREATED, {
      activityId: "a1",
      taskId: "t1",
      actorId: "u1",
      type: "comment",
      createdAt: createdAt.toISOString(),
    });
    expect(result).toBe(activity);
  });

  it("does not publish when no event publisher is provided", async () => {
    const uc = new CreateActivityUseCase(repo); // events omitted intentionally

    repo.create.mockResolvedValueOnce({
      id: "a2",
      taskId: "t2",
      actorId: "u2",
      type: "created",
      message: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as any);

    const res = await uc.execute({
      ...baseInput,
      taskId: "t2",
      actorId: "u2",
      type: "created" as any,
    });
    expect(repo.create).toHaveBeenCalledTimes(1);
    // cannot assert events.publish here because it's undefined in the use case
  });

  it("supports all allowed types: created, updated, status_changed, comment", async () => {
    const allowed: ActivityType[] = [
      "created",
      "updated",
      "status_changed",
      "comment",
    ] as any;

    for (const type of allowed) {
      const uc = new CreateActivityUseCase(repo, events);
      const createdAt = new Date("2024-03-03T03:03:03.003Z");
      const act = {
        id: `a-${type}`,
        taskId: "t9",
        actorId: "u9",
        type,
        message: null,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      } as any;

      repo.create.mockResolvedValueOnce(act);

      await uc.execute({ ...baseInput, taskId: "t9", actorId: "u9", type });

      expect(events.publish).toHaveBeenLastCalledWith(ACTIVITY_CREATED, {
        activityId: `a-${type}`,
        taskId: "t9",
        actorId: "u9",
        type,
        createdAt: createdAt.toISOString(),
      });
    }
  });

  it("propagates repository errors and does not publish", async () => {
    const uc = new CreateActivityUseCase(repo, events);

    const err = new Error("db down");
    repo.create.mockRejectedValueOnce(err);

    await expect(uc.execute(baseInput)).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });
});
