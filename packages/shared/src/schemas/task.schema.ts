import { z } from "zod";
import { Id, ISODate } from "./user.schema";

// Match your literal union: "todo" | "inProgress" | "done"
export const TaskStatus = z.enum(["todo", "inProgress", "done"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskSchema = z.object({
  id: Id,
  title: z.string().trim().min(1, "Title required"),
  description: z.string().trim().nullish(),
  status: TaskStatus,
  userId: Id,
  projectId: Id,
  createdAt: ISODate,
  updatedAt: ISODate.optional(), // set by DB
});

export type TTaskStatus = z.infer<typeof TaskStatus>;
export type TTask = z.infer<typeof TaskSchema>;
