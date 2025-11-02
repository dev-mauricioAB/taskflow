import { ActivityType } from "../schemas";

export interface Activity {
  id: string;
  taskId: string; // Task.id
  actorId: string; // User.id
  type: ActivityType;
  message?: string | null;
  createdAt: Date;
  deletedAt?: Date | null; // soft-delete timestamp
}
