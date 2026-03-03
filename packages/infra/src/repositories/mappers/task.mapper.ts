import type { Task } from "@repo/shared";
import type { TaskWithRelations } from "@repo/shared";

export function toTask(row: TaskWithRelations): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    userId: row.userId,
    projectId: row.projectId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? undefined,
  };
}
