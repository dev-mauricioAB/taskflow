import { z } from "zod";
import { ActivitySchema, ActivityType } from "../schemas/activity.schema";
import { Id } from "../schemas/user.schema";

// Create: server sets id/createdAt
export const CreateActivityDto = z.object({
  taskId: Id,
  actorId: Id,
  type: ActivityType,             // "created" | "updated" | "status_changed" | "comment"
  message: ActivitySchema.shape.message.optional(),
});

// Activities are immutable in many systems; if you plan to allow edits, use this:
export const UpdateActivityDto = z.object({
  message: ActivitySchema.shape.message.optional(),
}).strict();

export const ActivityParamsDto = z.object({
  id: Id,
});

export const ActivityQueryDto = z.object({
  taskId: Id.optional(),
  actorId: Id.optional(),
  type: ActivityType.optional(),
});

export type TCreateActivityDto = z.infer<typeof CreateActivityDto>;
export type TUpdateActivityDto = z.infer<typeof UpdateActivityDto>;
export type TActivityParamsDto = z.infer<typeof ActivityParamsDto>;
export type TActivityQueryDto = z.infer<typeof ActivityQueryDto>;
