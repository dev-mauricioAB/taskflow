import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { IProjectRepository, IEventPublisher } from "@repo/infra";
import { DomainError } from "@repo/infra";
import type {
  Project,
  ProjectUpdatedPayload,
  TUpdateProjectDto,
} from "@repo/shared";
import { PROJECT_UPDATED } from "@repo/shared";
import { UpdateProjectUseCase } from "../../project";

function makeProjects(): Mocked<IProjectRepository> {
  return {
    findById: vi.fn(),
    update: vi.fn(),
  } as unknown as Mocked<IProjectRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("UpdateProjectUseCase", () => {
  let projects: Mocked<IProjectRepository>;
  let events: Mocked<IEventPublisher>;
  let uc: UpdateProjectUseCase;

  const current: Project = {
    id: "p1",
    name: "Roadmap",
    ownerId: "u1",
    description: "Q1 goals" as any,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    deletedAt: null as any,
  } as Project;

  beforeEach(() => {
    vi.clearAllMocks();
    projects = makeProjects();
    events = makeEvents();
    uc = new UpdateProjectUseCase(projects, events);
  });

  it("throws NOT_FOUND when project does not exist", async () => {
    projects.findById.mockResolvedValueOnce(null);

    await expect(
      uc.execute({ projectId: "missing", patch: { name: "X" } }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "Project not found",
    });

    expect(projects.update).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("returns {changed:{}} when patch only includes undefined fields", async () => {
    projects.findById.mockResolvedValueOnce(current);

    const result = await uc.execute({
      projectId: "p1",
      patch: { name: undefined, description: undefined, ownerId: undefined },
    });

    expect(projects.update).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
    expect(result).toEqual({ changed: {} });
  });

  it("normalizes fields (trim) and passes only intended keys to repository", async () => {
    projects.findById.mockResolvedValueOnce(current);

    const repoProjection: TUpdateProjectDto = {
      id: "p1",
      name: "New Name",
      updatedAt: new Date("2024-02-02T00:00:00.000Z"),
    } as any;

    projects.update.mockResolvedValueOnce(repoProjection);

    const fixed = new Date("2024-02-02T01:02:03.004Z");
    vi.setSystemTime(fixed);

    const result = await uc.execute({
      projectId: "p1",
      patch: { name: "  New Name  ", description: undefined },
    });

    expect(projects.update).toHaveBeenCalledWith("p1", { name: "New Name" });

    expect(result).toEqual({
      changed: { name: "New Name" },
    });

    expect(events.publish).toHaveBeenCalledWith(PROJECT_UPDATED, {
      projectId: "p1",
      changed: { name: "New Name" },
      updatedAt: fixed.toISOString(),
    });

    vi.useRealTimers();
  });

  it("handles multiple keys; changed contains only intended ∩ returned", async () => {
    projects.findById.mockResolvedValueOnce(current);

    const repoProjection: TUpdateProjectDto = {
      id: "p1",
      name: "Alpha",
      description: "About Alpha",
      // Suppose repo also returns ownerId but intended may exclude it
      ownerId: "u2",
      updatedAt: new Date(),
    } as any;

    projects.update.mockResolvedValueOnce(repoProjection);

    const res = await uc.execute({
      projectId: "p1",
      patch: { name: " Alpha ", description: "  About Alpha  " },
    });

    expect(projects.update).toHaveBeenCalledWith("p1", {
      name: "Alpha",
      description: "About Alpha",
    });

    expect(res).toEqual({
      changed: { name: "Alpha", description: "About Alpha" },
    });

    const payload = events.publish.mock.calls[0]?.[1] as ProjectUpdatedPayload;
    expect(payload.changed).toEqual({
      name: "Alpha",
      description: "About Alpha",
    });
  });

  it("includes ownerId in changed only if included in intended keys", async () => {
    projects.findById.mockResolvedValueOnce(current);

    const repoProjection = {
      id: "p1",
      ownerId: "u9",
      updatedAt: new Date(),
    } as unknown as TUpdateProjectDto;

    projects.update.mockResolvedValueOnce(repoProjection);

    const res = await uc.execute({
      projectId: "p1",
      patch: { ownerId: "u9" },
    });

    expect(projects.update).toHaveBeenCalledWith("p1", { ownerId: "u9" });
    expect(res).toEqual({ changed: { ownerId: "u9" } });
  });

  it("defensive: throws NOT_FOUND when repository returns null after prior existence check", async () => {
    projects.findById.mockResolvedValueOnce(current);
    projects.update.mockResolvedValueOnce(null as any);

    await expect(
      uc.execute({ projectId: "p1", patch: { name: "X" } }),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "Project not found",
    });

    expect(events.publish).not.toHaveBeenCalled();
  });

  it("propagates repository errors (e.g., EMAIL_IN_USE, unique constraints) and does not publish", async () => {
    projects.findById.mockResolvedValueOnce(current);

    const err = new DomainError({
      code: "CONFLICT",
      message: "Duplicate name",
    });
    projects.update.mockRejectedValueOnce(err);

    await expect(
      uc.execute({ projectId: "p1", patch: { name: "Dup" } }),
    ).rejects.toBe(err);

    expect(events.publish).not.toHaveBeenCalled();
  });

  it("does not bring unintended fields from repo projection into changed", async () => {
    projects.findById.mockResolvedValueOnce(current);

    const repoProjection = {
      id: "p1",
      name: "Kept",
      description: "Kept",
      ownerId: "u7", // returned, but not intended
      updatedAt: new Date(),
    } as any;

    projects.update.mockResolvedValueOnce(repoProjection);

    const res = await uc.execute({
      projectId: "p1",
      patch: { name: "Kept", description: "Kept" },
    });

    expect(res).toEqual({ changed: { name: "Kept", description: "Kept" } });
  });
});
