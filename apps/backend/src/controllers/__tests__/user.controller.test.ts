// tests/controllers/user.controller.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { UserController } from "../user.controller";

// Minimal Express req/res helpers
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

describe("UserController", () => {
  let controller: UserController;

  beforeEach(() => {
    vi.restoreAllMocks();
    controller = new UserController();
  });

  describe("create", () => {
    it("400 when body missing/invalid", async () => {
      const req = mockReq({ body: undefined });
      const res = mockRes();

      await controller.create(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid body" });
    }); // Chainable res mocks and guard path [web:6][web:7]

    it("201 and returns created user", async () => {
      const req = mockReq({ body: { email: "a@b.com", name: "A" } });
      const res = mockRes();

      const execute = vi.fn().mockResolvedValue({ id: "u1" });
      const getterSpy = vi
        .spyOn(controller as any, "createUserUseCase", "get")
        .mockReturnValue({ execute });

      await controller.create(req as any, res as any);

      expect(execute).toHaveBeenCalledWith({ email: "a@b.com", name: "A" });
      expect(getterSpy).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: "u1" });
    }); // Assert on mocked function, not calling spy object [web:12][web:19]
  });

  describe("findAll", () => {
    it("200 and returns list", async () => {
      const req = mockReq();
      const res = mockRes();

      const findAll = vi.fn().mockResolvedValue([{ id: "u1" }]);
      const getterSpy = vi
        .spyOn(controller as any, "userRepo", "get")
        .mockReturnValue({ findAll });

      await controller.findAll(req as any, res as any);

      expect(getterSpy).toHaveBeenCalledTimes(1);
      expect(findAll).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ id: "u1" }]);
    }); // Direct handler invocation with repo method stub [web:6][web:5]
  });

  describe("delete", () => {
    it("204 and calls hard delete", async () => {
      const req = mockReq({ params: { id: "u1" }, query: { hard: "true" } });
      const res = mockRes();

      const execute = vi.fn().mockResolvedValue(undefined);
      const getterSpy = vi
        .spyOn(controller as any, "deleteUserUseCase", "get")
        .mockReturnValue({ execute });

      await controller.delete(req as any, res as any);

      expect(getterSpy).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenCalledWith({ userId: "u1", hard: true });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledTimes(1);
    }); // 204 + send() and argument assertion [web:6][web:7]
  });

  describe("update", () => {
    it("400 when email or name invalid", async () => {
      const req = mockReq({
        params: { id: "u1" },
        body: { email: "", name: "" },
      });
      const res = mockRes();

      await controller.update(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Email and Name are required",
      });
    }); // Validation branch without touching repo [web:6][web:5]

    it("200 and returns changed flag", async () => {
      const req = mockReq({
        params: { id: "u1" },
        body: { email: "a@b.com", name: "Alice" },
      });
      const res = mockRes();

      const update = vi.fn().mockResolvedValue({ changed: true });
      const getterSpy = vi
        .spyOn(controller as any, "userRepo", "get")
        .mockReturnValue({ update });

      await controller.update(req as any, res as any);

      expect(getterSpy).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith("u1", {
        email: "a@b.com",
        name: "Alice",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: "u1", changed: true });
    }); // Positive path and payload shape [web:6][web:5]
  });

  describe("findById", () => {
    it("400 when id missing", async () => {
      const req = mockReq({ params: {} });
      const res = mockRes();

      await controller.findById(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Missing user id" });
    }); // Required param guard [web:6][web:5]

    it("404 when not found", async () => {
      const req = mockReq({ params: { id: "u1" } });
      const res = mockRes();

      const findById = vi.fn().mockResolvedValue(null);
      const getterSpy = vi
        .spyOn(controller as any, "userRepo", "get")
        .mockReturnValue({ findById });

      await controller.findById(req as any, res as any);

      expect(getterSpy).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    }); // Not-found branch [web:6][web:5]

    it("200 and returns user", async () => {
      const req = mockReq({ params: { id: "u1" } });
      const res = mockRes();

      const user = { id: "u1", email: "a@b.com", name: "Alice" };
      const findById = vi.fn().mockResolvedValue(user);
      const getterSpy = vi
        .spyOn(controller as any, "userRepo", "get")
        .mockReturnValue({ findById });

      await controller.findById(req as any, res as any);

      expect(getterSpy).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith("u1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(user);
    }); // Success branch [web:6][web:5]
  });

  describe("reactivate", () => {
    it("400 when email missing", async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();

      await controller.reactivate(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Email is required" });
    }); // Email validation mirrors controller logic [web:6][web:5]

    it("200 and returns user from use case", async () => {
      const req = mockReq({ body: { email: "a@b.com" } });
      const res = mockRes();

      const execute = vi
        .fn()
        .mockResolvedValue({ id: "u1", email: "a@b.com", active: true });
      const getterSpy = vi
        .spyOn(controller as any, "reactivateUserUseCase", "get")
        .mockReturnValue({ execute });

      await controller.reactivate(req as any, res as any);

      expect(getterSpy).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenCalledWith("a@b.com");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: "u1",
        email: "a@b.com",
        active: true,
      });
    }); // Stub dependency and assert inputs/output [web:12][web:6]
  });
});
