import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockReq, mockRes } from "./helpers/express";
import { ActivityController } from "../activity.controller";

describe("ActivityController", () => {
  let controller: ActivityController;

  beforeEach(() => {
    controller = new ActivityController();
  });

  describe("create", () => {
    it("returns 201 with created activity", async () => {
      const req = mockReq<{
        taskId: string;
        actorId: string;
        type: string;
        message?: string;
      }>({
        body: { taskId: "t1", actorId: "u1", type: "COMMENT", message: "hi" },
      });
      const res = mockRes();
      const next = vi.fn();

      (controller as any).createUC = {
        execute: vi.fn().mockResolvedValue({ id: "a1", taskId: "t1" }),
      };

      await controller.create(req as any, res, next);

      expect((controller as any).createUC.execute).toHaveBeenCalledWith(
        req.body,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: "a1", taskId: "t1" });
      expect(next).not.toHaveBeenCalled();
    });

    it("forwards error to next(err)", async () => {
      const req = mockReq<{ taskId: string; actorId: string; type: string }>({
        body: { taskId: "t1", actorId: "u1", type: "COMMENT" },
      });
      const res = mockRes();
      const next = vi.fn();
      const boom = new Error("fail");

      (controller as any).createUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.create(req as any, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });

  describe("findByTaskId", () => {
    it("returns 200 with activities for the task", async () => {
      const req = mockReq<unknown, { id: string }>({ params: { id: "t1" } });
      const res = mockRes();
      const next = vi.fn();
      const items = [{ id: "a1" }, { id: "a2" }];

      (controller as any).getByTaskIdUC = {
        execute: vi.fn().mockResolvedValue(items),
      };

      await controller.findByTaskId(req, res, next);

      expect((controller as any).getByTaskIdUC.execute).toHaveBeenCalledWith({
        id: "t1",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(items);
    });

    it("calls next(err) on use case error", async () => {
      const req = mockReq<unknown, { id: string }>({ params: { id: "t1" } });
      const res = mockRes();
      const next = vi.fn();
      const boom = new Error("db");

      (controller as any).getByTaskIdUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.findByTaskId(req, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });

  describe("findMany", () => {
    it("forwards query and returns 200 with items", async () => {
      const req = mockReq<
        unknown,
        unknown,
        { taskId?: string; actorId?: string; type?: string }
      >({
        query: { taskId: "t1", actorId: "u1", type: "COMMENT" },
      });
      const res = mockRes();
      const next = vi.fn();
      const items = [{ id: "a1" }];

      (controller as any).findActivitiesUC = {
        execute: vi.fn().mockResolvedValue(items),
      };

      await controller.findMany(req as any, res, next);

      expect((controller as any).findActivitiesUC.execute).toHaveBeenCalledWith(
        req.query,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(items);
    });

    it("calls next(err) on use case error", async () => {
      const req = mockReq<unknown, unknown, Record<string, never>>({
        query: {},
      });
      const res = mockRes();
      const next = vi.fn();
      const boom = new Error("oops");

      (controller as any).findActivitiesUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.findMany(req as any, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });

  describe("update", () => {
    it("forwards id and body to use case and returns 200", async () => {
      const req = mockReq<{ message?: string; type?: string }, { id: string }>({
        params: { id: "a1" },
        body: { message: "updated", type: "COMMENT" },
      });
      const res = mockRes();
      const next = vi.fn();

      (controller as any).updateUC = {
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      await controller.update(req, res, next);

      expect((controller as any).updateUC.execute).toHaveBeenCalledWith("a1", {
        message: "updated",
        type: "COMMENT",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("calls next(err) on use case error", async () => {
      const req = mockReq<{ message?: string }, { id: string }>({
        params: { id: "a1" },
        body: { message: "updated" },
      });
      const res = mockRes();
      const next = vi.fn();
      const boom = new Error("conflict");

      (controller as any).updateUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.update(req, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });

  describe("delete", () => {
    it("forces hard=true and returns 204", async () => {
      const req = mockReq<unknown, { id: string }>({ params: { id: "a1" } });
      const res = mockRes();
      const next = vi.fn();

      (controller as any).deleteUC = {
        execute: vi.fn().mockResolvedValue(undefined),
      };

      await controller.delete(req, res, next);

      expect((controller as any).deleteUC.execute).toHaveBeenCalledWith({
        activityId: "a1",
        hard: true,
      });
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });

    it("calls next(err) on use case error", async () => {
      const req = mockReq<unknown, { id: string }>({ params: { id: "a1" } });
      const res = mockRes();
      const next = vi.fn();
      const boom = new Error("db");

      (controller as any).deleteUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.delete(req, res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });
  });
});
