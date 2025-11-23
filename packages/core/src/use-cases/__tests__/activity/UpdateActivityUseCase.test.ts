import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { IActivityRepository, IEventPublisher } from "@repo/infra";
import type { TUpdateActivityDto } from "@repo/shared";
import { ACTIVITY_UPDATED } from "@repo/shared";
import { UpdateActivityUseCase } from "../../activity";

function makeRepo(): Mocked<IActivityRepository> {
  return {
    exists: vi.fn(),
    update: vi.fn(),
  } as unknown as Mocked<IActivityRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("UpdateActivityUseCase", () => {
  let repo: Mocked<IActivityRepository>;
  let events: Mocked<IEventPublisher>;
  let uc: UpdateActivityUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    events = makeEvents();
    uc = new UpdateActivityUseCase(repo, events);
  });

  it("throws NOT_FOUND when activity does not exist", async () => {
    repo.exists.mockResolvedValueOnce(false);

    await expect(
      uc.execute("missing", { message: "x" }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "Activity 'missing' not found",
    });

    expect(repo.update).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("rejects empty message after trim with VALIDATION_FAILED", async () => {
    repo.exists.mockResolvedValueOnce(true);

    await expect(
      uc.execute("a1", { message: "   " }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "VALIDATION_FAILED",
      message: "Message cannot be empty",
    });

    expect(repo.update).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("ignores undefined fields and returns changed {} when nothing intended", async () => {
    repo.exists.mockResolvedValueOnce(true);

    const result = await uc.execute("a1", { message: undefined });

    expect(repo.update).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
    expect(result).toEqual({ changed: {} });
  });

  it("normalizes message (trim), updates with minimal patch, computes changed, and publishes event with occurredAt ISO", async () => {
    repo.exists.mockResolvedValueOnce(true);

    const repoProjection: TUpdateActivityDto = {
      id: "a1",
      message: "Edited",
      // updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    } as any;

    repo.update.mockResolvedValueOnce(repoProjection);

    const fixed = new Date("2024-01-02T03:04:05.006Z");
    vi.setSystemTime(fixed);

    const result = await uc.execute("a1", { message: "  Edited  " });

    expect(repo.update).toHaveBeenCalledWith("a1", { message: "Edited" });

    expect(result).toEqual({ changed: { message: "Edited" } });

    expect(events.publish).toHaveBeenCalledWith(
      ACTIVITY_UPDATED,
      {
        activityId: "a1",
        changed: { message: "Edited" },
        occurredAt: fixed.toISOString(),
      },
    );

    vi.useRealTimers();
  });

  it("does not include non-intended fields from repo projection in changed", async () => {
    repo.exists.mockResolvedValueOnce(true);

    const repoProjection = {
      id: "a2",
      message: "Kept",
      actorId: "u9", // returned but not intended
    } as unknown as TUpdateActivityDto;

    repo.update.mockResolvedValueOnce(repoProjection);

    const res = await uc.execute("a2", { message: "Kept" });

    expect(res).toEqual({ changed: { message: "Kept" } });
  });

  it("publishes no event when changed is empty (should not happen with current single-field logic, but guarded)", async () => {
    repo.exists.mockResolvedValueOnce(true);

    // Simulate repo projection that excludes intended key
    const repoProjection = { id: "a3" } as unknown as TUpdateActivityDto;
    repo.update.mockResolvedValueOnce(repoProjection);

    const out = await uc.execute("a3", { message: "X" });

    expect(out).toEqual({ changed: {} });
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("defensive: throws NOT_FOUND when repository returns null after existence check", async () => {
    repo.exists.mockResolvedValueOnce(true);
    repo.update.mockResolvedValueOnce(null as any);

    await expect(uc.execute("a4", { message: "X" })).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "Activity 'a4' not found",
    });

    expect(events.publish).not.toHaveBeenCalled();
  });

  it("propagates repository errors and does not publish", async () => {
    repo.exists.mockResolvedValueOnce(true);
    const err = new Error("db down");
    repo.update.mockRejectedValueOnce(err);

    await expect(uc.execute("a5", { message: "X" })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });
});
