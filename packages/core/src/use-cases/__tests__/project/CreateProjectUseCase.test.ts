import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { IProjectRepository, IEventPublisher, NewEntity } from "@repo/infra";
import type { Project } from "@repo/shared";
import { PROJECT_CREATED } from "@repo/shared";
import { CreateProjectUseCase } from "../../project";

function makeProjects(): Mocked<IProjectRepository> {
  return {
    create: vi.fn(),
    // add other stubs if your interface requires them
  } as unknown as Mocked<IProjectRepository>;
}

function makeEvents(): Mocked<IEventPublisher> {
  return {
    publish: vi.fn(),
  } as unknown as Mocked<IEventPublisher>;
}

describe("CreateProjectUseCase", () => {
  let projects: Mocked<IProjectRepository>;
  let events: Mocked<IEventPublisher>;
  let uc: CreateProjectUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    projects = makeProjects();
    events = makeEvents();
    uc = new CreateProjectUseCase(projects, events);
  });

  it("rejects when name is missing or blank after trim", async () => {
    await expect(
      uc.execute({ name: "   " } as unknown as NewEntity<Project>),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "VALIDATION_FAILED",
      message: "Project name is required",
    });

    await expect(
      uc.execute({} as unknown as NewEntity<Project>),
    ).rejects.toMatchObject({
      name: "DomainError",
      code: "VALIDATION_FAILED",
    });

    expect(projects.create).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it("creates project and publishes PROJECT_CREATED with ownerId (if present) and createdAt ISO", async () => {
    const input = {
      name: "Roadmap",
      ownerId: "u1",
      description: "Q1 goals",
    } as unknown as NewEntity<Project>;

    const createdAt = new Date("2024-03-01T10:00:00.000Z");
    const project: Project = {
      id: "p1",
      name: "Roadmap",
      ownerId: "u1",
      description: "Q1 goals" as any,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null as any,
    } as Project;

    projects.create.mockResolvedValueOnce(project);

    const result = await uc.execute(input);

    expect(projects.create).toHaveBeenCalledWith(input);

    expect(events.publish).toHaveBeenCalledWith(PROJECT_CREATED, {
      projectId: "p1",
      ownerId: "u1",
      name: "Roadmap",
      createdAt: createdAt.toISOString(),
    });

    expect(result).toBe(project);
  });

  it("publishes with empty ownerId string when project.ownerId is undefined", async () => {
    const input = { name: "Solo Project" } as unknown as NewEntity<Project>;

    const createdAt = new Date("2024-04-01T00:00:00.000Z");
    const project = {
      id: "p2",
      name: "Solo Project",
      ownerId: undefined,
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      description: null,
    } as unknown as Project;

    projects.create.mockResolvedValueOnce(project);

    await uc.execute(input);

    expect(events.publish).toHaveBeenCalledWith(PROJECT_CREATED, {
      projectId: "p2",
      ownerId: "",
      name: "Solo Project",
      createdAt: createdAt.toISOString(),
    });
  });

  it("propagates repository errors and does not publish event on failure", async () => {
    const input = { name: "X" } as unknown as NewEntity<Project>;
    const err = new Error("db down");
    projects.create.mockRejectedValueOnce(err);

    await expect(uc.execute(input)).rejects.toBe(err);
    expect(events.publish).not.toHaveBeenCalled();
  });
});
