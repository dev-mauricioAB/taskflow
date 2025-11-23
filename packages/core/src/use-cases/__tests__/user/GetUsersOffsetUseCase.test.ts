import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { UserRepository } from "@repo/infra";
import type { TUserOffsetPagination, OffsetPage, User } from "@repo/shared";
import { GetUsersOffsetUseCase } from "../../user";

function makeRepo(): Mocked<UserRepository> {
  return {
    findAll: vi.fn(),
    // add no-op stubs for other methods if your concrete type requires them
  } as unknown as Mocked<UserRepository>;
}

describe("GetUsersOffsetUseCase", () => {
  let repo: Mocked<UserRepository>;
  let uc: GetUsersOffsetUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new GetUsersOffsetUseCase(repo);
  });

  it("trims q, parses string limit/offset, defaults sortDir to desc", async () => {
    const input: TUserOffsetPagination = {
      q: "  alice  ",
      limit: "50" as any,
      offset: "10" as any,
      includeDeleted: 1 as any, // truthy
      sortBy: "name" as any,
      sortDir: 'desc'
      // sortDir omitted -> desc
    };

    const page: OffsetPage<User, any> = {
      data: [] as any,
      total: 0,
      limit: 50,
      offset: 10,
      sortBy: "name",
      sortDir: "desc",
    };
    repo.findAll.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith({
      q: "alice",
      limit: 50,
      offset: 10,
      includeDeleted: true,
      sortBy: "name",
      sortDir: "desc",
    });
    expect(result).toBe(page);
  });

  it("defaults limit to 20 and offset to 0 when not provided", async () => {
    const input = {} as unknown as TUserOffsetPagination;

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
      limit: 20,
      offset: 0,
      includeDeleted: false,
      sortBy: undefined,
      sortDir: "desc",
    });
    expect(result).toBe(page);
  });

  it("accepts numeric limit/offset directly", async () => {
    const input = {
      limit: 5,
      offset: 15,
      sortBy: "createdAt",
      sortDir: "asc",
    } as unknown as TUserOffsetPagination;

    const page = {
      data: [],
      total: 0,
      limit: 5,
      offset: 15,
      sortBy: "createdAt",
      sortDir: "asc",
    } as any;
    repo.findAll.mockResolvedValueOnce(page);

    await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith({
      q: undefined,
      limit: 5,
      offset: 15,
      includeDeleted: false,
      sortBy: "createdAt",
      sortDir: "asc",
    });
  });

  it("normalizes sortDir only when valid; otherwise defaults to desc", async () => {
    const input = {
      sortBy: "email",
      sortDir: "up" as any, // invalid
    } as unknown as TUserOffsetPagination;

    repo.findAll.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
      sortBy: "email",
      sortDir: "desc",
    } as any);

    await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith({
      q: undefined,
      limit: 20,
      offset: 0,
      includeDeleted: false,
      sortBy: "email",
      sortDir: "desc",
    });
  });

  it("casts includeDeleted to boolean (truthy values -> true)", async () => {
    const input = {
      includeDeleted: "yes" as any,
    } as unknown as TUserOffsetPagination;

    repo.findAll.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
      sortBy: undefined,
      sortDir: "desc",
    } as any);

    await uc.execute(input);

    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ includeDeleted: true }),
    );
  });

  it("trims q to empty string → passes empty string (adjust to undefined if desired)", async () => {
    const input = { q: "   " } as unknown as TUserOffsetPagination;

    repo.findAll.mockResolvedValueOnce({
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
      sortBy: undefined,
      sortDir: "desc",
    } as any);

    await uc.execute(input);

    // Current use case uses input.q?.trim(), so q becomes "" not undefined
    expect(repo.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ q: "" }),
    );
  });

  it("propagates repository errors", async () => {
    const input = { limit: 10, offset: 0 } as unknown as TUserOffsetPagination;
    const err = new Error("db down");
    repo.findAll.mockRejectedValueOnce(err);

    await expect(uc.execute(input)).rejects.toBe(err);
  });
});
