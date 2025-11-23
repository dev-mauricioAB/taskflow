import { z } from "zod";
import { TaskStatus } from "../schemas/task.schema";
import { Id } from "../schemas/user.schema";

// GET /tasks (offset)
export const TaskOffsetPaginationDto = z.object({
  q: z.string().trim().min(1).optional(),
  projectId: Id.optional(),
  userId: Id.optional(),
  status: TaskStatus.optional(),

  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  includeDeleted: z.coerce.boolean().optional().default(false),

  sortBy: z
    .enum(["createdAt", "updatedAt", "title", "status"])
    .default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

// GET /tasks/cursor
export const TaskCursorPaginationDto = z.object({
  q: z.string().trim().min(1).optional(),
  projectId: Id.optional(),
  userId: Id.optional(),
  status: TaskStatus.optional(),

  // take>0 forward, take<0 backward
  take: z.coerce.number().int().min(-100).max(100).default(20),

  // accept "abc" or { id: "abc" }; normalize to { id }
  cursor: z
    .object({ id: Id })
    .or(
      z
        .string()
        .trim()
        .min(1)
        .transform((id) => ({ id })),
    )
    .optional(),

  includeDeleted: z.coerce.boolean().optional().default(false),

  // prefer unique field for cursor ordering; id is stable
  sortBy: z.enum(["id", "createdAt"]).default("id"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type TTaskOffsetPagination = z.infer<typeof TaskOffsetPaginationDto>;
export type TTaskCursorPagination = z.infer<typeof TaskCursorPaginationDto>;
