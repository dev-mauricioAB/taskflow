// task.controller.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TaskController } from "../task.controller";

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  res.send = vi.fn().mockReturnThis();
  res.sendStatus = vi.fn().mockReturnThis();
  return res as any;
}
const mockNext = () => vi.fn();

describe("TaskController", () => {
  let controller: TaskController;

  beforeEach(() => {
    controller = new TaskController();
  });

  describe("create", () => {
    it("returns 201 with created task", async () => {
      const req: any = {
        body: { title: "T1", description: "d", userId: "u1" },
      };
      const res = mockRes();
      const next = mockNext();

      (controller as any).createTaskEC = {
        execute: vi.fn().mockResolvedValue({ id: "t1", title: "T1" }),
      };

      await controller.create(req, res, next);

      expect((controller as any).createTaskEC.execute).toHaveBeenCalledWith(
        req.body,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: "t1", title: "T1" });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next(err) on error", async () => {
      const req: any = { body: { title: "T1" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("fail");

      (controller as any).createTaskEC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.create(req, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });

  describe("findAll (offset)", () => {
    it("returns 200 with page", async () => {
      const req: any = { query: { q: "t", limit: 10, offset: 0 } };
      const res = mockRes();
      const next = mockNext();
      const page = { total: 1, items: [{ id: "t1" }] };

      (controller as any).getTasksOffsetUC = {
        execute: vi.fn().mockResolvedValue(page),
      };

      await controller.findAll(req, res, next);

      expect((controller as any).getTasksOffsetUC.execute).toHaveBeenCalledWith(
        req.query,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(page);
    });

    it("calls next(err) on error", async () => {
      const req: any = { query: {} };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("db");

      (controller as any).getTasksOffsetUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.findAll(req, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });

  describe("findAllCursor", () => {
    it("returns 200 with cursor page", async () => {
      const req: any = { query: { take: 2, cursor: "t1", sortDir: "asc" } };
      const res = mockRes();
      const next = mockNext();
      const page = { items: [{ id: "t2" }], nextCursor: "t2" };

      (controller as any).getTasksCursorUC = {
        execute: vi.fn().mockResolvedValue(page),
      };

      await controller.findAllCursor(req, res, next);

      expect((controller as any).getTasksCursorUC.execute).toHaveBeenCalledWith(
        req.query,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(page);
    });

    it("calls next(err) on error", async () => {
      const req: any = { query: {} };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("oops");

      (controller as any).getTasksCursorUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.findAllCursor(req, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });

  describe("findById", () => {
    it("returns 200 with task", async () => {
      const req: any = { params: { id: "t1" } };
      const res = mockRes();
      const next = mockNext();

      (controller as any).getTaskByIdUC = {
        execute: vi.fn().mockResolvedValue({ id: "t1" }),
      };

      await controller.findById(req, res, next);

      expect((controller as any).getTaskByIdUC.execute).toHaveBeenCalledWith({
        id: "t1",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ id: "t1" });
    });

    it("calls next(err) on UC error", async () => {
      const req: any = { params: { id: "t1" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("db");

      (controller as any).getTaskByIdUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.findById(req, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });

  describe("update", () => {
    it("trims strings, forwards patch, returns 200", async () => {
      const req: any = {
        params: { id: "t1" },
        body: {
          title: "  New Title  ",
          description: "  Desc  ",
          status: "OPEN",
          userId: "u1",
          projectId: "p1",
        },
      };
      const res = mockRes();
      const next = mockNext();

      (controller as any).updateTaskUC = {
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      await controller.update(req, res, next);

      expect((controller as any).updateTaskUC.execute).toHaveBeenCalledWith(
        "t1",
        {
          title: "New Title",
          description: "Desc",
          status: "OPEN",
          userId: "u1",
          projectId: "p1",
        },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("propagates UC error via next", async () => {
      const req: any = { params: { id: "t1" }, body: { title: "X" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("conflict");

      (controller as any).updateTaskUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.update(req, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });

  describe("complete", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-01T00:00:00.000Z"));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("calls UC with frozen date and returns ISO", async () => {
      const req: any = { params: { id: "t1" } };
      const res = mockRes();
      const next = mockNext();

      const execute = vi.fn().mockResolvedValue(undefined);
      (controller as any).completeTaskUC = { execute };

      await controller.complete(req, res, next);

      expect(execute).toHaveBeenCalledTimes(1);
      const calledAt = (execute.mock.calls[0] as any[])[1] as Date;
      expect((execute.mock.calls[0] as any[])[0]).toBe("t1");
      expect(calledAt.toISOString()).toBe("2024-06-01T00:00:00.000Z");

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        completedAt: "2024-06-01T00:00:00.000Z",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next(err) on UC error", async () => {
      const req: any = { params: { id: "t1" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("fail");

      (controller as any).completeTaskUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.complete(req, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });

  describe("delete", () => {
    it("returns 204 and hard=true", async () => {
      const req: any = { params: { id: "t1" }, query: {} };
      const res = mockRes();
      const next = mockNext();

      (controller as any).deleteTaskUC = {
        execute: vi.fn().mockResolvedValue(undefined),
      };

      await controller.delete(req, res, next);

      expect((controller as any).deleteTaskUC.execute).toHaveBeenCalledWith({
        taskId: "t1",
        hard: true,
      });
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });

    it("calls next(err) on UC error", async () => {
      const req: any = { params: { id: "t1" }, query: {} };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("db");

      (controller as any).deleteTaskUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.delete(req, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });
});
