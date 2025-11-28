import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { ProjectRepository } from "@repo/infra";
import type {
  TProjectOffsetPagination,
  OffsetPage,
  Project,
} from "@repo/shared";
import { GetProjectsOffsetUseCase } from "../../project";

function makeRepo(): Mocked<ProjectRepository> {
  return {
    findAll: vi.fn(),
  } as unknown as Mocked<ProjectRepository>;
}

describe("GetProjectsOffsetUseCase", () => {
  let repo: Mocked<ProjectRepository>;
  let uc: GetProjectsOffsetUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new GetProjectsOffsetUseCase(repo);
  });

  it("parses string limit/offset, trims q to undefined when blank, defaults sortDir to desc", async () => {
    const input: TProjectOffsetPagination = {
      q: "   ", // trim -> "" -> undefined
      ownerId: "u1",
      limit: "50" as any, // -> 50
      offset: "10" as any, // -> 10
      // sortDir omitted -> desc
      // sortBy passed as undefined
      includeDeleted: 0 as any, // falsy -> false
    };

    const page: OffsetPage<Project, any> = {
      data: [] as any,
      total: 0,
      limit: 50,
      offset: 10,
      sortBy: undefined,
      sortDir: "desc",
    };
    repo.findAll.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith({
      q: undefined,
      ownerId: "u1",
      limit: 50,
      offset: 10,
      includeDeleted: false,
      sortBy: undefined,
      sortDir: "desc",
    });
    expect(result).toBe(page);
  });

  it("accepts numeric limit/offset directly; honors explicit sortDir/sortBy; casts includeDeleted", async () => {
    const input: TProjectOffsetPagination = {
      q: "alpha",
      ownerId: "u2",
      limit: 5,
      offset: 15,
      sortDir: "asc",
      sortBy: "name" as any,
      includeDeleted: "yes" as any, // truthy -> true
    };

    const page = {
      data: [],
      total: 0,
      limit: 5,
      offset: 15,
      sortBy: "name",
      sortDir: "asc",
    } as any;
    repo.findAll.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith({
      q: "alpha",
      ownerId: "u2",
      limit: 5,
      offset: 15,
      includeDeleted: true,
      sortBy: "name",
      sortDir: "asc",
    });
    expect(result).toBe(page);
  });

  it("defaults limit=20 and offset=0 when not provided", async () => {
    const input = {} as unknown as TProjectOffsetPagination;

    const page = {
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
      sortBy: undefined,
      sortDir: "desc",
    } as any;
    repo.findAll.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith({
      q: undefined,
      ownerId: undefined,
      limit: 20,
      offset: 0,
      includeDeleted: false,
      sortBy: undefined,
      sortDir: "desc",
    });
    expect(result).toBe(page);
  });

  it("normalizes invalid sortDir to desc", async () => {
    const input = {
      sortDir: "down" as any,
      limit: "1" as any,
      offset: "2" as any,
    } as unknown as TProjectOffsetPagination;

    repo.findAll.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 1,
      offset: 2,
      sortBy: undefined,
      sortDir: "desc",
    } as any);

    await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ sortDir: "desc" }),
    );
  });

  it("propagates repository errors", async () => {
    const err = new Error("db down");
    repo.findAll.mockRejectedValueOnce(err);

    await expect(uc.execute({ limit: 10, offset: 0 } as any)).rejects.toBe(err);
  });
});
