import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { IActivityRepository, IEventPublisher } from "@repo/infra";
import { ACTIVITY_DELETED } from "@repo/shared";
import { DeleteActivityUseCase } from "../../activity";

function makeActivities(): Mocked<IActivityRepository> {
  return {
    exists: vi.fn(),
    delete: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
  } as unknown as Mocked<IActivityRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("DeleteActivityUseCase", () => {
  let repo: Mocked<IActivityRepository>;
  let events: Mocked<IEventPublisher>;
  let uc: DeleteActivityUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeActivities();
    events = makeEvents();
    uc = new DeleteActivityUseCase(repo, events);
  });

  it("throws NOT_FOUND when activity does not exist", async () => {
    repo.exists.mockResolvedValueOnce(false);

    await expect(uc.execute({ activityId: "missing" })).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "Activity not found",
    });

    expect(repo.softDelete).not.toHaveBeenCalled();
    expect(repo.hardDelete).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("hard-deletes when hard=true and publishes event with hard=true", async () => {
    repo.exists.mockResolvedValueOnce(true);
    repo.hardDelete.mockResolvedValueOnce(true as any);

    const fixed = new Date("2024-01-01T12:34:56.789Z");
    vi.setSystemTime(fixed);

    await uc.execute({ activityId: "a1", hard: true });

    expect(repo.hardDelete).toHaveBeenCalledWith("a1");
    expect(repo.softDelete).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();

    expect(events.publish).toHaveBeenCalledWith(
      ACTIVITY_DELETED,
      {
        activityId: "a1",
        occurredAt: fixed.toISOString(),
        hard: true,
      },
    );

    vi.useRealTimers();
  });

  it("soft-deletes by default and publishes event with hard=false", async () => {
    repo.exists.mockResolvedValueOnce(true);
    repo.softDelete.mockResolvedValueOnce(true as any);

    const fixed = new Date("2024-02-02T00:00:00.000Z");
    vi.setSystemTime(fixed);

    await uc.execute({ activityId: "a2" });

    // soft path receives Date now
    const whenArg = repo.softDelete.mock.calls[0]?.[1] as Date;
    expect(whenArg).toEqual(fixed);

    expect(repo.hardDelete).not.toHaveBeenCalled();
    expect(repo.delete).not.toHaveBeenCalled();

    expect(events.publish).toHaveBeenCalledWith(ACTIVITY_DELETED, {
      activityId: "a2",
      occurredAt: fixed.toISOString(),
      hard: false,
    });

    vi.useRealTimers();
  });

  it("falls back to physical delete when softDelete/hardDelete are not present", async () => {
    // simulate absence by setting to undefined
    repo.softDelete = undefined as any;
    repo.hardDelete = undefined as any;

    repo.exists.mockResolvedValueOnce(true);
    repo.delete.mockResolvedValueOnce(undefined as any);

    const fixed = new Date("2024-03-03T03:03:03.003Z");
    vi.setSystemTime(fixed);

    // Recreate use case to capture mutated repo
    uc = new DeleteActivityUseCase(repo, events);

    await uc.execute({ activityId: "a3" });

    expect(repo.delete).toHaveBeenCalledWith("a3");
    expect(events.publish).toHaveBeenCalledWith(ACTIVITY_DELETED, {
      activityId: "a3",
      occurredAt: fixed.toISOString(),
      hard: false,
    });

    vi.useRealTimers();
  });

  it("propagates errors from exists", async () => {
    const err = new Error("db down");
    repo.exists.mockRejectedValueOnce(err);

    await expect(uc.execute({ activityId: "x" })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("propagates errors from hardDelete and does not publish", async () => {
    repo.exists.mockResolvedValueOnce(true);
    const err = new Error("cannot hard delete");
    repo.hardDelete.mockRejectedValueOnce(err);

    await expect(uc.execute({ activityId: "a4", hard: true })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("propagates errors from softDelete and does not publish", async () => {
    repo.exists.mockResolvedValueOnce(true);
    const err = new Error("cannot soft delete");
    repo.softDelete.mockRejectedValueOnce(err);

    await expect(uc.execute({ activityId: "a5" })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("propagates errors from delete fallback and does not publish", async () => {
    repo.exists.mockResolvedValueOnce(true);
    repo.softDelete = undefined as any;
    repo.hardDelete = undefined as any;

    const err = new Error("cannot delete");
    repo.delete.mockRejectedValueOnce(err);

    uc = new DeleteActivityUseCase(repo, events);

    await expect(uc.execute({ activityId: "a6" })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });
});
