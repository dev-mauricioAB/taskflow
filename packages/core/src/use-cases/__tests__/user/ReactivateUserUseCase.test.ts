import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import type { IUserRepository } from "@repo/infra";
import type { User } from "@repo/shared";
import { ReactivateUserUseCase } from "../../user";

function makeRepo(): Mocked<IUserRepository> {
  return {
    findByEmail: vi.fn(),
    reactivate: vi.fn(),
    // stubs to satisfy type if needed by your interface
    create: vi.fn() as any,
    findById: vi.fn() as any,
    update: vi.fn() as any,
    delete: vi.fn() as any,
    softDelete: vi.fn() as any,
    hardDelete: vi.fn() as any,
  } as unknown as Mocked<IUserRepository>;
}

describe("ReactivateUserUseCase", () => {
  let repo: Mocked<IUserRepository>;
  let uc: ReactivateUserUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = makeRepo();
    uc = new ReactivateUserUseCase(repo);
  });

  it("normalizes email (trim + lowercase) and reactivates by found user id", async () => {
    const input = "  ALICE@Example.com  ";
    const normalized = "alice@example.com";

    const found: User = {
      id: "u1",
      name: "Alice",
      email: normalized,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(), // inactive
    } as User;

    const reactivated: User = {
      ...found,
      deletedAt: null as any,
      updatedAt: new Date(),
    } as User;

    repo.findByEmail.mockResolvedValueOnce(found);
    repo.reactivate.mockResolvedValueOnce(reactivated);

    const result = await uc.execute(input);

    expect(repo.findByEmail).toHaveBeenCalledWith(normalized);
    expect(repo.reactivate).toHaveBeenCalledWith("u1");
    expect(result).toBe(reactivated);
  });

  it("throws NOT_FOUND DomainError with normalized email in details when no user exists", async () => {
    const input = "  MISSING@EXAMPLE.COM ";
    const normalized = "missing@example.com";

    repo.findByEmail.mockResolvedValueOnce(null);

    await expect(uc.execute(input)).rejects.toMatchObject({
      name: "DomainError",
      code: "NOT_FOUND",
      message: "No account found for this email.",
      details: { email: normalized },
    });

    expect(repo.reactivate).not.toHaveBeenCalled();
  });

  it("propagates repository errors from findByEmail", async () => {
    const err = new Error("db down");
    repo.findByEmail.mockRejectedValueOnce(err);

    await expect(uc.execute("x@example.com")).rejects.toBe(err);
  });

  it("propagates repository errors from reactivate", async () => {
    const user: User = {
      id: "u2",
      name: "Bob",
      email: "bob@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
    } as User;

    repo.findByEmail.mockResolvedValueOnce(user);

    const err = new Error("cannot update");
    repo.reactivate.mockRejectedValueOnce(err);

    await expect(uc.execute("bob@example.com")).rejects.toBe(err);
  });

  it("works when the user is already active (repo may still return current user)", async () => {
    // Behavior depends on repository; this test assumes reactivate is idempotent.
    const user: User = {
      id: "u3",
      name: "Carol",
      email: "carol@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
    } as User;

    const same = { ...user, updatedAt: new Date() } as User;

    repo.findByEmail.mockResolvedValueOnce(user);
    repo.reactivate.mockResolvedValueOnce(same);

    const res = await uc.execute("  CAROL@EXAMPLE.COM ");
    expect(repo.findByEmail).toHaveBeenCalledWith("carol@example.com");
    expect(repo.reactivate).toHaveBeenCalledWith("u3");
    expect(res).toBe(same);
  });
});
