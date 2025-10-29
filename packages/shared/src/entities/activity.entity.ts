export type ActivityType = "created" | "updated" | "status_changed" | "comment";

export interface Activity {
  id: string;
  taskId: string;           // Task.id
  actorId: string;          // User.id
  type: ActivityType;
  message?: string | null;
  createdAt: Date;
}
