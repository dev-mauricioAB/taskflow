import { Prisma } from "@prisma/client";
import { ProjectFilters } from "../interfaces";

export function buildProjectWhere({
  q,
  ownerId,
  includeDeleted,
}: ProjectFilters & { includeDeleted?: boolean }): Prisma.ProjectWhereInput {
  return {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
            {
              description: { contains: q, mode: Prisma.QueryMode.insensitive },
            },
          ],
        }
      : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(includeDeleted ? {} : { deletedAt: null }),
  };
}

export type TaskFilters = {
  q?: string;
  projectId?: string;
  userId?: string;
  status?: "todo" | "inProgress" | "done";
  includeDeleted?: boolean;
};

// Helper to build a strongly typed where
export function buildTaskWhere({
  q,
  projectId,
  userId,
  status,
  includeDeleted,
}: TaskFilters & { includeDeleted?: boolean }): Prisma.TaskWhereInput {
  return {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: Prisma.QueryMode.insensitive } },
            {
              description: { contains: q, mode: Prisma.QueryMode.insensitive },
            },
          ],
        }
      : {}),
    ...(projectId ? { projectId } : {}),
    ...(userId ? { userId } : {}),
    ...(status ? { status } : {}),
    ...(includeDeleted ? {} : { deletedAt: null }),
  };
}
