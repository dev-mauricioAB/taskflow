import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { ProjectRepository } from "@repo/infra";
import type { Project } from "@repo/shared";
import { GetProjectByIdUseCase } from "../../project";

function makeRepo(): Mocked<ProjectRepository> {
  return {
    findById: vi.fn(),
    // add stubs for other methods if your concrete type requires them
  } as unknown as Mocked<ProjectRepository>;
}

describe("GetProjectByIdUseCase", () => {
  let repo: Mocked<ProjectRepository>;
  let uc: GetProjectByIdUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new GetProjectByIdUseCase(repo);
  });

  it("delegates to repo.findById with params.id and returns the project", async () => {
    const project: Project = {
      id: "p1",
      name: "Roadmap",
      ownerId: "u1",
      description: null as any,
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
      deletedAt: null as any,
    } as Project;

    repo.findById.mockResolvedValueOnce(project);

    const result = await uc.execute({ id: "p1" });

    expect(repo.findById).toHaveBeenCalledWith("p1");
    expect(result).toBe(project);
  });

  it("returns null when repository returns null", async () => {
    repo.findById.mockResolvedValueOnce(null);

    const result = await uc.execute({ id: "missing" });

    expect(repo.findById).toHaveBeenCalledWith("missing");
    expect(result).toBeNull();
  });

  it("propagates repository errors without remapping", async () => {
    const err = new Error("db down");
    repo.findById.mockRejectedValueOnce(err);

    await expect(uc.execute({ id: "p1" })).rejects.toBe(err);
  });
});
