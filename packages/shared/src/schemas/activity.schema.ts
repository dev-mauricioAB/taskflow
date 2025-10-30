import { z } from "zod";
import { Id, ISODate } from "./user.schema";

// Match your literal union: "created" | "updated" | "status_changed" | "comment"
export const ActivityType = z.enum(["created", "updated", "status_changed", "comment"]);
export type ActivityType = z.infer<typeof ActivityType>;

export const ActivitySchema = z.object({
  id: Id,
  taskId: Id,
  actorId: Id,
  type: ActivityType,
  message: z.string().trim().nullish(), // string | null | undefined
  createdAt: ISODate,
});

export type TActivityType = z.infer<typeof ActivityType>;
export type TActivity = z.infer<typeof ActivitySchema>;
