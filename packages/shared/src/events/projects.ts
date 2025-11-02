export const PROJECT_CREATED = "project.created";
export type ProjectCreatedPayload = {
  projectId: string;
  ownerId: string; // or teamId, depending on your model
  name: string;
  createdAt: string; // ISO
};

export const PROJECT_UPDATED = "project.updated";
export type ProjectUpdatedPayload = {
  projectId: string;
  changed: Record<string, unknown>;
  updatedAt: string;
};

export const PROJECT_DELETED = "project.deleted" as const;
export type ProjectDeletedPayload = {
  projectId: string; // canonical identifier for the deleted project [web:68]
  occurredAt: string; // ISO timestamp for ordering in consumers [web:68]
  hard: boolean; // true = hard delete, false = soft delete (tombstone) [web:68]
};

export type ProjectEvents = {
  [PROJECT_CREATED]: ProjectCreatedPayload;
  [PROJECT_UPDATED]: ProjectUpdatedPayload;
  [PROJECT_DELETED]: ProjectDeletedPayload;
};
