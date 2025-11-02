import { ActivityType } from "../schemas";

export const ACTIVITY_CREATED = "activity.created";
export type ActivityCreatedPayload = {
  activityId: string;
  taskId?: string;
  actorId?: string;
  type: ActivityType;
  createdAt: string;
};

export const ACTIVITY_UPDATED = "activity.updated";
export type ActivityUpdatedPayload = {
  activityId: string;
  changed: Record<string, unknown>;
  occurredAt: string;
};

export const ACTIVITY_DELETED = "activity.deleted" as const;
export type ActivityDeletedPayload = {
  activityId: string;
  occurredAt: string; // ISO
  hard: boolean;
};

export type ActivityEvents = {
  [ACTIVITY_CREATED]: ActivityCreatedPayload;
  [ACTIVITY_UPDATED]: ActivityUpdatedPayload;
  [ACTIVITY_DELETED]: ActivityDeletedPayload;
};
