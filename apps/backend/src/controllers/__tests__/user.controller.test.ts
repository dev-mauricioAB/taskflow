// tests/controllers/user.controller.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { UserController } from "../user.controller";

// Minimal Express req/res/next helpers
function mockReq<TBody = any, TParams = any, TQuery = any>(
  data: Partial<Request<TParams, any, TBody, TQuery>> = {},
) {
  return {
    params: {} as any,
    body: {} as any,
    query: {} as any,
    ...data,
  } as unknown as Request<TParams, any, TBody, TQuery>;
}

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function mockNext() {
  return vi.fn() as unknown as NextFunction;
}

describe("UserController", () => {
  let controller: UserController;

  beforeEach(() => {
    vi.restoreAllMocks();
    controller = new UserController();
  });

  describe("create", () => {
    it("201 and returns created user", async () => {
      const req = mockReq({ body: { email: "a@b.com", name: "A" } });
      const res = mockRes();
      const next = mockNext();

      const execute = vi.fn().mockResolvedValue({ id: "u1" });
      vi.spyOn(controller as any, "createUserUseCase", "get").mockReturnValue({ execute });

      await controller.create(req as any, res as any, next);

      expect(execute).toHaveBeenCalledWith({ email: "a@b.com", name: "A" });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: "u1" });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next on error", async () => {
      const req = mockReq({ body: { email: "a@b.com", name: "A" } });
      const res = mockRes();
      const next = mockNext();

      const error = new Error("boom");
      const execute = vi.fn().mockRejectedValue(error);
      vi.spyOn(controller as any, "createUserUseCase", "get").mockReturnValue({ execute });

      await controller.create(req as any, res as any, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("findAll", () => {
    it("200 and returns paginated list", async () => {
      const req = mockReq({ query: { limit: 20, offset: 0, sortBy: "createdAt", sortDir: "desc", includeDeleted: false } });
      const res = mockRes();
      const next = mockNext();

      const page = {
        data: [{ id: "u1" }],
        total: 1,
        limit: 20,
        offset: 0,
        sortBy: "createdAt",
        sortDir: "desc",
      };
      const findAll = vi.fn().mockResolvedValue(page);
      vi.spyOn(controller as any, "userRepo", "get").mockReturnValue({ findAll });

      await controller.findAll(req as any, res as any, next);

      expect(findAll).toHaveBeenCalledWith({
        q: undefined,
        limit: 20,
        offset: 0,
        includeDeleted: false,
        sortBy: "createdAt",
        sortDir: "desc",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(page);
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next on error", async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();
      const next = mockNext();

      const err = new Error("db");
      const findAll = vi.fn().mockRejectedValue(err);
      vi.spyOn(controller as any, "userRepo", "get").mockReturnValue({ findAll });

      await controller.findAll(req as any, res as any, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("delete", () => {
    it("204 and calls hard delete", async () => {
      const req = mockReq({ params: { id: "u1" } });
      const res = mockRes();
      const next = mockNext();

      const execute = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(controller as any, "deleteUserUseCase", "get").mockReturnValue({ execute });

      await controller.delete(req as any, res as any, next);

      expect(execute).toHaveBeenCalledWith({ userId: "u1", hard: true });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next on error", async () => {
      const req = mockReq({ params: { id: "u1" } });
      const res = mockRes();
      const next = mockNext();

      const err = new Error("boom");
      const execute = vi.fn().mockRejectedValue(err);
      vi.spyOn(controller as any, "deleteUserUseCase", "get").mockReturnValue({ execute });

      await controller.delete(req as any, res as any, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("update", () => {
    it("200 and returns changed keys", async () => {
      const req = mockReq({
        params: { id: "u1" },
        body: { email: "a@b.com", name: "Alice" },
      });
      const res = mockRes();
      const next = mockNext();

      const update = vi.fn().mockResolvedValue({ changed: { name: "Alice" } });
      vi.spyOn(controller as any, "userRepo", "get").mockReturnValue({ update });

      await controller.update(req as any, res as any, next);

      expect(update).toHaveBeenCalledWith("u1", { email: "a@b.com", name: "Alice" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: "u1", changed: { name: "Alice" } });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next on error", async () => {
      const req = mockReq({ params: { id: "u1" }, body: { email: "a@b.com", name: "Alice" } });
      const res = mockRes();
      const next = mockNext();

      const err = new Error("db");
      const update = vi.fn().mockRejectedValue(err);
      vi.spyOn(controller as any, "userRepo", "get").mockReturnValue({ update });

      await controller.update(req as any, res as any, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("findById", () => {
    it("404 when not found", async () => {
      const req = mockReq({ params: { id: "u1" } });
      const res = mockRes();
      const next = mockNext();

      const findById = vi.fn().mockResolvedValue(null);
      vi.spyOn(controller as any, "userRepo", "get").mockReturnValue({ findById });

      await controller.findById(req as any, res as any, next);

      expect(findById).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
      expect(next).not.toHaveBeenCalled();
    });

    it("200 and returns user", async () => {
      const user = { id: "u1", email: "a@b.com", name: "Alice" };
      const req = mockReq({ params: { id: "u1" } });
      const res = mockRes();
      const next = mockNext();

      const findById = vi.fn().mockResolvedValue(user);
      vi.spyOn(controller as any, "userRepo", "get").mockReturnValue({ findById });

      await controller.findById(req as any, res as any, next);

      expect(findById).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(user);
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next on error", async () => {
      const req = mockReq({ params: { id: "u1" } });
      const res = mockRes();
      const next = mockNext();

      const err = new Error("db");
      const findById = vi.fn().mockRejectedValue(err);
      vi.spyOn(controller as any, "userRepo", "get").mockReturnValue({ findById });

      await controller.findById(req as any, res as any, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("reactivate", () => {
    it("200 and returns user from use case", async () => {
      const req = mockReq<{ email: string }>({ body: { email: "a@b.com" } });
      const res = mockRes();
      const next = mockNext();

      const execute = vi.fn().mockResolvedValue({ id: "u1", email: "a@b.com", active: true });
      vi.spyOn(controller as any, "reactivateUserUseCase", "get").mockReturnValue({ execute });

      await controller.reactivate(req as any, res as any, next);

      expect(execute).toHaveBeenCalledWith("a@b.com");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: "u1", email: "a@b.com", active: true });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next on error", async () => {
      const req = mockReq<{ email: string }>({ body: { email: "a@b.com" } });
      const res = mockRes();
      const next = mockNext();

      const err = new Error("boom");
      const execute = vi.fn().mockRejectedValue(err);
      vi.spyOn(controller as any, "reactivateUserUseCase", "get").mockReturnValue({ execute });

      await controller.reactivate(req as any, res as any, next);
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
