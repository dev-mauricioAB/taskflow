import { z } from "zod";
import { Id, ISODate } from "./user.schema";

export const ProjectSchema = z.object({
  id: Id,
  ownerId: Id,
  name: z.string().trim().min(1, "Project name required"),
  description: z.string().trim().nullish(), // string | null | undefined
  createdAt: ISODate,
  updatedAt: ISODate.optional(), // optional, not null by default
});

export type TProject = z.infer<typeof ProjectSchema>;
