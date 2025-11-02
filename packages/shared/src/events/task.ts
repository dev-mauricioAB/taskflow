// @repo/shared/events.ts
import { TaskStatus } from "../schemas";

export const TASK_CREATED = "task.created" as const;
export type TaskCreatedPayload = {
  taskId: string;
  title: string;
  createdAt: string; // ISO
};

export const TASK_COMPLETED = "task.completed" as const;
export type TaskCompletedPayload = {
  taskId: string;
  completedAt: string; // ISO
};

export const TASK_STATUS_CHANGED = "task.status_changed" as const;
export type TaskStatusChangedPayload = {
  taskId: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
  actorId: string;
  occurredAt: string; // ISO
};

// NEW: deletion event
export const TASK_DELETED = "task.deleted" as const;
export type TaskDeletedPayload = {
  taskId: string;
  occurredAt: string; // ISO
  // optionally: actorId?: string; correlationId?: string; reason?: string;
};

// Union (extend your typed map)
export type TaskEvents = {
  [TASK_CREATED]: TaskCreatedPayload;
  [TASK_COMPLETED]: TaskCompletedPayload;
  [TASK_STATUS_CHANGED]: TaskStatusChangedPayload;
  [TASK_DELETED]: TaskDeletedPayload;
};
