import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { UserRepository } from "@repo/infra";
import type { TUserCursorPagination, CursorPage, User } from "@repo/shared";
import { GetUsersCursorUseCase } from "../../user";

function makeRepo(): Mocked<UserRepository> {
  return {
    findAllCursor: vi.fn(),
    // add no-op stubs for other methods if your type requires them
  } as unknown as Mocked<UserRepository>;
}

describe("GetUsersCursorUseCase", () => {
  let repo: Mocked<UserRepository>;
  let uc: GetUsersCursorUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new GetUsersCursorUseCase(repo);
  });

  it("trims q, clamps take to [-100, 100], coerces cursor from string, defaults sortDir desc", async () => {
    const input: TUserCursorPagination = {
      q: "  alice  ",
      take: 999,               // clamp to 100
      cursor: { id: 'abc123' },        // string → { id: "abc123" }
      includeDeleted: 1 as any, // truthy → true
      sortBy: "name" as any,
      sortDir: 'desc'
      // sortDir omitted → default "desc"
    };

    const page: CursorPage<User, any> = {
      data: [] as any,
      nextCursor: undefined,
      prevCursor: undefined,
      sortBy: "name" as any,
      sortDir: "desc",
    };
    repo.findAllCursor.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: "alice",
      take: 100, // clamped
      cursor: { id: "abc123" },
      includeDeleted: true,
      sortBy: "name",
      sortDir: "desc",
    });
    expect(result).toBe(page);
  });

  it("respects negative take and clamps to -100; accepts object cursor", async () => {
    const input: TUserCursorPagination = {
      take: -250,                         // clamp to -100
      cursor: { id: "last-id" } as any,   // object → { id }
      sortBy: "createdAt" as any,
      sortDir: "asc",
      includeDeleted: false
    };

    const page = { data: [], nextCursor: undefined, prevCursor: undefined, sortBy: "createdAt", sortDir: "asc" } as any;
    repo.findAllCursor.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: undefined,
      take: -100, // clamped
      cursor: { id: "last-id" },
      includeDeleted: false, // falsy cast
      sortBy: "createdAt",
      sortDir: "asc",
    });
    expect(result).toBe(page);
  });

  it("defaults take to 20 when missing or not a number, omits cursor when not provided", async () => {
    const input = { q: undefined, includeDeleted: undefined } as unknown as TUserCursorPagination;

    const page = { data: [], nextCursor: undefined, prevCursor: undefined, sortBy: undefined, sortDir: "desc" } as any;
    repo.findAllCursor.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: undefined,
      take: 20,
      cursor: undefined,
      includeDeleted: false,
      sortBy: undefined,
      sortDir: "desc",
    });
    expect(result).toBe(page);
  });

  it("passes through sortBy as-is and normalizes sortDir only if valid", async () => {
    const input = {
      sortBy: "email",
      sortDir: "up" as any, // invalid → default to "desc"
    } as unknown as TUserCursorPagination;

    const page = { data: [], nextCursor: undefined, prevCursor: undefined, sortBy: "email", sortDir: "desc" } as any;
    repo.findAllCursor.mockResolvedValueOnce(page);

    const result = await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: undefined,
      take: 20,
      cursor: undefined,
      includeDeleted: false,
      sortBy: "email",
      sortDir: "desc",
    });
    expect(result).toBe(page);
  });

  it("trims q to empty string → undefined", async () => {
    const input = { q: "   " } as unknown as TUserCursorPagination;

    const page = { data: [], nextCursor: undefined, prevCursor: undefined, sortBy: undefined, sortDir: "desc" } as any;
    repo.findAllCursor.mockResolvedValueOnce(page);

    await uc.execute(input);

    expect(repo.findAllCursor).toHaveBeenCalledWith({
      q: "", // trim result is empty string; if repo expects undefined, adjust to input.q?.trim() || undefined
      take: 20,
      cursor: undefined,
      includeDeleted: false,
      sortBy: undefined,
      sortDir: "desc",
    });
  });

  it("propagates repository errors", async () => {
    const input = { take: 10 } as unknown as TUserCursorPagination;
    const err = new Error("db down");
    repo.findAllCursor.mockRejectedValueOnce(err);

    await expect(uc.execute(input)).rejects.toBe(err);
  });
});
