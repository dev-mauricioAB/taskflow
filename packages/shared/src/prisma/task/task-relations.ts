import { Prisma } from "@prisma/client";
import { TASK_FIND_MANY_INCLUDE } from "./task-queries";

export const taskWithRelations = Prisma.validator<Prisma.TaskDefaultArgs>()({
  include: TASK_FIND_MANY_INCLUDE,
});

export type TaskWithRelations = Prisma.TaskGetPayload<typeof taskWithRelations>;
