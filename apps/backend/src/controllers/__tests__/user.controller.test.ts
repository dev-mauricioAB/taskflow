// user.controller.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserController } from "../user.controller";

// helpers for Express mocks
function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  res.send = vi.fn().mockReturnThis();
  return res as any;
}
function mockNext() {
  return vi.fn();
}

describe("UserController", () => {
  let controller: UserController;

  beforeEach(() => {
    controller = new UserController();
  });

  describe("create", () => {
    it("returns 201 with created user", async () => {
      const req: any = { body: { email: "a@b.com", name: "Alice" } };
      const res = mockRes();
      const next = mockNext();

      // stub the use case
      (controller as any).createUserUC = {
        execute: vi
          .fn()
          .mockResolvedValue({ id: "u1", email: "a@b.com", name: "Alice" }),
      };

      await controller.create(req, res, next);

      expect((controller as any).createUserUC.execute).toHaveBeenCalledWith(
        req.body,
      ); // success path call
      expect(res.status).toHaveBeenCalledWith(201); // returns 201
      expect(res.json).toHaveBeenCalledWith({
        id: "u1",
        email: "a@b.com",
        name: "Alice",
      }); // returns body
      expect(next).not.toHaveBeenCalled(); // no error
    });

    it("delegates to next on error", async () => {
      const req: any = { body: { email: "x@y.com", name: "X" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("fail");

      (controller as any).createUserUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(boom); // error path calls next
    });
  });

  describe("findAll (offset)", () => {
    it("returns 200 with paginated result", async () => {
      const req: any = {
        query: {
          q: "ali",
          limit: 10,
          offset: 0,
          includeDeleted: false,
          sortBy: "createdAt",
          sortDir: "desc",
        },
      };
      const res = mockRes();
      const next = mockNext();
      const payload = { total: 1, items: [{ id: "u1" }] };

      (controller as any).getUsersOffsetUC = {
        execute: vi.fn().mockResolvedValue(payload),
      };

      await controller.findAll(req, res, next);

      expect((controller as any).getUsersOffsetUC.execute).toHaveBeenCalledWith(
        req.query,
      ); // forwards query params [web:4]
      expect(res.status).toHaveBeenCalledWith(200); // OK
      expect(res.json).toHaveBeenCalledWith(payload); // body
    });

    it("next(err) on UC error", async () => {
      const req: any = { query: {} };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("db");

      (controller as any).getUsersOffsetUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.findAll(req, res, next);
      expect(next).toHaveBeenCalledWith(boom); // bubbled error
    });
  });

  describe("findAllCursor", () => {
    it("returns 200 with cursor result", async () => {
      const req: any = {
        query: {
          q: "ali",
          take: 2,
          cursor: "u1",
          includeDeleted: false,
          sortBy: "createdAt",
          sortDir: "asc",
        },
      };
      const res = mockRes();
      const next = mockNext();
      const payload = { items: [{ id: "u2" }], nextCursor: "u2" };

      (controller as any).getUsersCursorUC = {
        execute: vi.fn().mockResolvedValue(payload),
      };

      await controller.findAllCursor(req, res, next);

      expect((controller as any).getUsersCursorUC.execute).toHaveBeenCalledWith(
        req.query,
      ); // forwards query [web:4]
      expect(res.status).toHaveBeenCalledWith(200); // OK
      expect(res.json).toHaveBeenCalledWith(payload); // body
    });
  });

  describe("delete", () => {
    it("returns 204 on success with hard=true", async () => {
      const req: any = { params: { id: "u1" } };
      const res = mockRes();
      const next = mockNext();

      (controller as any).deleteUserUC = {
        execute: vi.fn().mockResolvedValue(undefined),
      };

      await controller.delete(req, res, next);

      expect((controller as any).deleteUserUC.execute).toHaveBeenCalledWith({
        userId: "u1",
        hard: true,
      }); // hard true [web:4]
      expect(res.status).toHaveBeenCalledWith(204); // No Content
      expect(res.send).toHaveBeenCalled(); // empty body
    });

    it("next(err) on UC error", async () => {
      const req: any = { params: { id: "u1" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("fail");

      (controller as any).deleteUserUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.delete(req, res, next);
      expect(next).toHaveBeenCalledWith(boom); // error
    });
  });

  describe("update", () => {
    it("returns 422 when body has no fields", async () => {
      const req: any = { params: { id: "u1" }, body: {} };
      const res = mockRes();
      const next = mockNext();

      await controller.update(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422); // validation failure mapping
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.any(String),
          message: expect.stringContaining("at least one"),
        }),
      ); // error details
      expect(next).not.toHaveBeenCalled(); // handled response
    });

    it("returns 200 on valid patch", async () => {
      const req: any = { params: { id: "u1" }, body: { name: "New" } };
      const res = mockRes();
      const next = mockNext();

      (controller as any).updateUserUC = {
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      await controller.update(req, res, next);

      expect((controller as any).updateUserUC.execute).toHaveBeenCalledWith({
        userId: "u1",
        patch: { email: undefined, name: "New" },
      }); // passes patch fields [web:4]
      expect(res.status).toHaveBeenCalledWith(200); // OK
      expect(res.json).toHaveBeenCalledWith({ success: true }); // body
    });

    it("next(err) on UC error", async () => {
      const req: any = { params: { id: "u1" }, body: { email: "e@x.com" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("conflict");

      (controller as any).updateUserUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.update(req, res, next);
      expect(next).toHaveBeenCalledWith(boom); // error path
    });
  });

  describe("findById", () => {
    it("returns 200 with user when found", async () => {
      const req: any = { params: { id: "u1" } };
      const res = mockRes();
      const next = mockNext();

      (controller as any).getUserByIdUC = {
        execute: vi.fn().mockResolvedValue({ id: "u1" }),
      };

      await controller.findById(req, res, next);

      expect((controller as any).getUserByIdUC.execute).toHaveBeenCalledWith({
        id: "u1",
      }); // forwards id [web:4]
      expect(res.status).toHaveBeenCalledWith(200); // OK
      expect(res.json).toHaveBeenCalledWith({ id: "u1" }); // user
    });

    it("next(NotFound) when missing", async () => {
      const req: any = { params: { id: "u1" } };
      const res = mockRes();
      const next = mockNext();

      (controller as any).getUserByIdUC = {
        execute: vi.fn().mockResolvedValue(null),
      };

      await controller.findById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error)); // DomainError forwarded
    });

    it("next(err) on UC error", async () => {
      const req: any = { params: { id: "u1" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("db");

      (controller as any).getUserByIdUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.findById(req, res, next);
      expect(next).toHaveBeenCalledWith(boom); // error path
    });
  });

  describe("reactivate", () => {
    it("next(VALIDATION_FAILED) when email missing", async () => {
      const req: any = { body: {} };
      const res = mockRes();
      const next = mockNext();

      await controller.reactivate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error)); // validation error bubbled via next
    });

    it("returns 200 with user on success", async () => {
      const req: any = { body: { email: "a@b.com" } };
      const res = mockRes();
      const next = mockNext();
      const user = { id: "u1", email: "a@b.com" };

      (controller as any).reactivateUserUC = {
        execute: vi.fn().mockResolvedValue(user),
      };

      await controller.reactivate(req, res, next);

      expect((controller as any).reactivateUserUC.execute).toHaveBeenCalledWith(
        "a@b.com",
      ); // forwards email [web:4]
      expect(res.status).toHaveBeenCalledWith(200); // OK
      expect(res.json).toHaveBeenCalledWith(user); // body
    });

    it("next(err) on UC error", async () => {
      const req: any = { body: { email: "a@b.com" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("oops");

      (controller as any).reactivateUserUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.reactivate(req, res, next);
      expect(next).toHaveBeenCalledWith(boom); // error
    });
  });
});
