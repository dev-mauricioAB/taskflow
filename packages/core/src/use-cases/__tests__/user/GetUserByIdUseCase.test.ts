import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { User } from "@repo/shared";
import { DomainError } from "@repo/infra";
import type { UserRepository } from "@repo/infra";
import { GetUserByIdUseCase } from "../../user";

function makeRepo(): Mocked<UserRepository> {
  return {
    findById: vi.fn(),
    // add stubs for other methods if your concrete type requires them at compile time
  } as unknown as Mocked<UserRepository>;
}

describe("GetUserByIdUseCase", () => {
  let repo: Mocked<UserRepository>;
  let uc: GetUserByIdUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new GetUserByIdUseCase(repo);
  });

  it("delegates to repo.findById with params.id and returns the user", async () => {
    const user: User = {
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
      deletedAt: null as any,
    } as User;

    repo.findById.mockResolvedValueOnce(user);

    const result = await uc.execute({ id: "u1" });

    expect(repo.findById).toHaveBeenCalledWith("u1");
    expect(result).toBe(user);
  });

  it("returns null when repo.findById returns null", async () => {
    repo.findById.mockResolvedValueOnce(null);

    const result = await uc.execute({ id: "missing" });

    expect(repo.findById).toHaveBeenCalledWith("missing");
    expect(result).toBeNull();
  });

  it("propagates DomainError from repository (e.g., validation) without remapping", async () => {
    const validationErr = new DomainError({
      code: "VALIDATION_FAILED",
      message: "Invalid id",
      details: { id: "" },
    });
    repo.findById.mockRejectedValueOnce(validationErr);

    await expect(uc.execute({ id: "" as any })).rejects.toBe(validationErr);
  });

  it("propagates unknown errors from repository", async () => {
    const unknown = new Error("db down");
    repo.findById.mockRejectedValueOnce(unknown);

    await expect(uc.execute({ id: "u1" })).rejects.toBe(unknown);
  });
});
