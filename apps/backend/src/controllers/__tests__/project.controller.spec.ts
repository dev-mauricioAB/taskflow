// src/controllers/__tests__/project.controller.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectController } from "../project.controller";

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  res.send = vi.fn().mockReturnThis();
  res.sendStatus = vi.fn().mockReturnThis();
  return res as any;
}
const mockNext = () => vi.fn();

describe("ProjectController", () => {
  let controller: ProjectController;

  beforeEach(() => {
    controller = new ProjectController();
  });

  describe("create", () => {
    it("trims strings and returns 201 with created project", async () => {
      const req: any = {
        body: {
          ownerId: "u1",
          name: "  My Project  ",
          description: "  Some desc  ",
        },
      };
      const res = mockRes();
      const next = mockNext();

      (controller as any).createUC = {
        execute: vi.fn().mockResolvedValue({ id: "p1", name: "My Project" }),
      };

      await controller.create(req, res, next);

      expect((controller as any).createUC.execute).toHaveBeenCalledWith({
        ownerId: "u1",
        name: "My Project",
        description: "Some desc",
      }); // forwards trimmed fields
      expect(res.status).toHaveBeenCalledWith(201); // created
      expect(res.json).toHaveBeenCalledWith({ id: "p1", name: "My Project" }); // body
      expect(next).not.toHaveBeenCalled(); // handled
    });

    it("calls next(err) on UC error", async () => {
      const req: any = { body: { ownerId: "u1", name: "X" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("fail");

      (controller as any).createUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.create(req, res, next);
      expect(next).toHaveBeenCalledWith(boom); // bubbled error
    });
  });

  describe("findAll (offset)", () => {
    it("forwards query and returns 200 with page", async () => {
      const req: any = {
        query: {
          q: "proj",
          ownerId: "u1",
          limit: 10,
          offset: 0,
          includeDeleted: false,
          sortBy: "createdAt",
          sortDir: "desc",
        },
      };
      const res = mockRes();
      const next = mockNext();
      const page = { total: 1, items: [{ id: "p1" }] };

      (controller as any).getProjectsOffsetUC = {
        execute: vi.fn().mockResolvedValue(page),
      };

      await controller.findAll(req, res, next);

      expect(
        (controller as any).getProjectsOffsetUC.execute,
      ).toHaveBeenCalledWith(req.query); // forwards
      expect(res.status).toHaveBeenCalledWith(200); // OK
      expect(res.json).toHaveBeenCalledWith(page); // page
    });

    it("calls next(err) on UC error", async () => {
      const req: any = { query: {} };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("db");

      (controller as any).getProjectsOffsetUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.findAll(req, res, next);
      expect(next).toHaveBeenCalledWith(boom); // bubbled
    });
  });

  describe("findAllCursor", () => {
    it("forwards query and returns 200 with cursor page", async () => {
      const req: any = {
        query: {
          q: "proj",
          ownerId: "u1",
          take: 2,
          cursor: "p1",
          includeDeleted: false,
          sortBy: "createdAt",
          sortDir: "asc",
        },
      };
      const res = mockRes();
      const next = mockNext();
      const page = { items: [{ id: "p2" }], nextCursor: "p2" };

      (controller as any).getProjectsCursorUC = {
        execute: vi.fn().mockResolvedValue(page),
      };

      await controller.findAllCursor(req, res, next);

      expect(
        (controller as any).getProjectsCursorUC.execute,
      ).toHaveBeenCalledWith(req.query); // forwards
      expect(res.status).toHaveBeenCalledWith(200); // OK
      expect(res.json).toHaveBeenCalledWith(page); // body
    });

    it("calls next(err) on UC error", async () => {
      const req: any = { query: {} };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("oops");

      (controller as any).getProjectsCursorUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.findAllCursor(req, res, next);
      expect(next).toHaveBeenCalledWith(boom); // bubbled
    });
  });

  describe("findById", () => {
    it("returns 200 with project when found", async () => {
      const req: any = { params: { id: "p1" } };
      const res = mockRes();
      const next = mockNext();

      (controller as any).getProjectByIdUC = {
        execute: vi.fn().mockResolvedValue({ id: "p1" }),
      };

      await controller.findById(req, res, next);

      expect((controller as any).getProjectByIdUC.execute).toHaveBeenCalledWith(
        { id: "p1" },
      ); // forwards id
      expect(res.status).toHaveBeenCalledWith(200); // OK
      expect(res.json).toHaveBeenCalledWith({ id: "p1" }); // body
    });

    it("returns 404 when not found", async () => {
      const req: any = { params: { id: "p1" } };
      const res = mockRes();
      const next = mockNext();

      (controller as any).getProjectByIdUC = {
        execute: vi.fn().mockResolvedValue(null),
      };

      await controller.findById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404); // not found
      expect(res.json).toHaveBeenCalledWith({ error: "Not found" }); // body
      expect(next).not.toHaveBeenCalled(); // handled response
    });

    it("calls next(err) on UC error", async () => {
      const req: any = { params: { id: "p1" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("db");

      (controller as any).getProjectByIdUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.findById(req, res, next);
      expect(next).toHaveBeenCalledWith(boom); // bubbled
    });
  });

  describe("update", () => {
    it("builds trimmed patch and returns 200", async () => {
      const req: any = {
        params: { id: "p1" },
        body: {
          name: "  Renamed  ",
          description: "  New desc  ",
        },
      };
      const res = mockRes();
      const next = mockNext();

      (controller as any).updateUC = {
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      await controller.update(req, res, next);

      expect((controller as any).updateUC.execute).toHaveBeenCalledWith({
        projectId: "p1",
        patch: { name: "Renamed", description: "New desc" },
      }); // trimmed patch
      expect(res.status).toHaveBeenCalledWith(200); // OK
      expect(res.json).toHaveBeenCalledWith({ success: true }); // body
    });

    it("omits undefined fields in patch", async () => {
      const req: any = { params: { id: "p1" }, body: { name: undefined } };
      const res = mockRes();
      const next = mockNext();

      const execute = vi.fn().mockResolvedValue({ success: true });
      (controller as any).updateUC = { execute };

      await controller.update(req, res, next);

      // Extract the actual patch argument sent
      const arg = execute.mock.calls[0][0];
      expect(arg.projectId).toBe("p1"); // id forwarded
      expect(arg.patch).toStrictEqual({}); // no fields set if undefined
      expect(res.status).toHaveBeenCalledWith(200); // OK
      expect(res.json).toHaveBeenCalledWith({ success: true }); // body
    });

    it("calls next(err) on UC error", async () => {
      const req: any = { params: { id: "p1" }, body: { name: "X" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("conflict");

      (controller as any).updateUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.update(req, res, next);
      expect(next).toHaveBeenCalledWith(boom); // bubbled
    });
  });

  describe("delete", () => {
    it("parses hard=true and returns 204", async () => {
      const req: any = { params: { id: "p1" }, query: { hard: "true" } };
      const res = mockRes();
      const next = mockNext();

      (controller as any).deleteUC = {
        execute: vi.fn().mockResolvedValue(undefined),
      };

      await controller.delete(req, res, next);

      expect((controller as any).deleteUC.execute).toHaveBeenCalledWith({
        projectId: "p1",
        hard: true,
      }); // hard true forwarded
      expect(res.sendStatus).toHaveBeenCalledWith(204); // no content
    });

    it("defaults hard=false when not provided", async () => {
      const req: any = { params: { id: "p1" }, query: {} };
      const res = mockRes();
      const next = mockNext();

      (controller as any).deleteUC = {
        execute: vi.fn().mockResolvedValue(undefined),
      };

      await controller.delete(req, res, next);

      expect((controller as any).deleteUC.execute).toHaveBeenCalledWith({
        projectId: "p1",
        hard: false,
      }); // default false
      expect(res.sendStatus).toHaveBeenCalledWith(204); // no content
    });

    it("calls next(err) on UC error", async () => {
      const req: any = { params: { id: "p1" }, query: { hard: "true" } };
      const res = mockRes();
      const next = mockNext();
      const boom = new Error("db");

      (controller as any).deleteUC = {
        execute: vi.fn().mockRejectedValue(boom),
      };

      await controller.delete(req, res, next);
      expect(next).toHaveBeenCalledWith(boom); // bubbled
    });
  });
});
