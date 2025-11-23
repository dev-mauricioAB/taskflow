import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { IProjectRepository, IEventPublisher } from "@repo/infra";
import type { Project } from "@repo/shared";
import { PROJECT_DELETED } from "@repo/shared";
import { DeleteProjectUseCase } from "../../project";

function makeProjects(): Mocked<IProjectRepository> {
  return {
    findById: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
  } as unknown as Mocked<IProjectRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("DeleteProjectUseCase", () => {
  let projects: Mocked<IProjectRepository>;
  let events: Mocked<IEventPublisher>;
  let uc: DeleteProjectUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    projects = makeProjects();
    events = makeEvents();
    uc = new DeleteProjectUseCase(projects, events);
  });

  it("throws NOT_FOUND when project does not exist", async () => {
    projects.findById.mockResolvedValueOnce(null);

    await expect(
      uc.execute({ projectId: "missing" }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "Project not found",
    });

    expect(projects.softDelete).not.toHaveBeenCalled();
    expect(projects.hardDelete).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("soft-deletes by default and publishes PROJECT_DELETED with occurredAt ISO and hard=false", async () => {
    const p: Project = {
      id: "p1",
      name: "Proj",
      ownerId: "u1",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
      description: null as any,
    } as Project;

    const fixed = new Date("2024-01-01T12:34:56.789Z");
    vi.setSystemTime(fixed);

    projects.findById.mockResolvedValueOnce(p);
    projects.softDelete.mockResolvedValueOnce(true);

    await uc.execute({ projectId: "p1" });

    // soft delete receives a Date close to now
    const whenArg = projects.softDelete.mock.calls[0]?.[1] as Date;
    expect(whenArg).toEqual(fixed);

    expect(events.publish).toHaveBeenCalledWith(PROJECT_DELETED, {
      projectId: "p1",
      occurredAt: fixed.toISOString(),
      hard: false,
    });

    expect(projects.hardDelete).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("hard-deletes when hard=true and publishes PROJECT_DELETED with hard=true; does not call softDelete", async () => {
    const p = { id: "p2", name: "X" } as Project;

    const fixed = new Date("2024-02-02T00:00:00.000Z");
    vi.setSystemTime(fixed);

    projects.findById.mockResolvedValueOnce(p);
    projects.hardDelete.mockResolvedValueOnce(true);

    await uc.execute({ projectId: "p2", hard: true });

    expect(projects.hardDelete).toHaveBeenCalledWith("p2");
    expect(projects.softDelete).not.toHaveBeenCalled();

    expect(events.publish).toHaveBeenCalledWith(PROJECT_DELETED, {
      projectId: "p2",
      occurredAt: fixed.toISOString(),
      hard: true,
    });

    vi.useRealTimers();
  });

  it("propagates repository errors from findById", async () => {
    const err = new Error("db down");
    projects.findById.mockRejectedValueOnce(err);

    await expect(uc.execute({ projectId: "p3" })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("propagates repository errors from softDelete and does not publish", async () => {
    projects.findById.mockResolvedValueOnce({ id: "p4", name: "P4" } as any);
    const err = new Error("cannot soft delete");
    projects.softDelete.mockRejectedValueOnce(err);

    await expect(uc.execute({ projectId: "p4" })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("propagates repository errors from hardDelete and does not publish", async () => {
    projects.findById.mockResolvedValueOnce({ id: "p5", name: "P5" } as any);
    const err = new Error("cannot hard delete");
    projects.hardDelete.mockRejectedValueOnce(err);

    await expect(uc.execute({ projectId: "p5", hard: true })).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });
});
