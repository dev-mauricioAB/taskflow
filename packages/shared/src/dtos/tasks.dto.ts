import { z } from "zod";
import { TaskSchema, TaskStatus } from "../schemas/task.schema";
import { Id } from "../schemas/user.schema";

// Create: client provides title, status, userId, projectId; description optional
export const CreateTaskDto = z
  .object({
    title: TaskSchema.shape.title,
    description: TaskSchema.shape.description.optional(),
    status: TaskStatus.default("todo"), // "todo" | "inProgress" | "done"
    userId: Id,
    projectId: Id,
  })
  .strict();

// Update: all mutable fields optional
export const UpdateTaskDto = z
  .object({
    title: TaskSchema.shape.title.optional(),
    description: TaskSchema.shape.description.optional(),
    status: TaskStatus.optional(),
    userId: Id.optional(),
    projectId: Id.optional(),
  })
  .strict();

export const TaskParamsDto = z
  .object({
    id: Id,
  })
  .strict();

export const TaskQueryDto = z
  .object({
    projectId: Id.optional(),
    userId: Id.optional(),
    status: TaskStatus.optional(),
  })
  .strict();

export type TCreateTaskDto = z.infer<typeof CreateTaskDto>;
export type TUpdateTaskDto = z.infer<typeof UpdateTaskDto>;
export type TTaskParamsDto = z.infer<typeof TaskParamsDto>;
export type TTaskQueryDto = z.infer<typeof TaskQueryDto>;
