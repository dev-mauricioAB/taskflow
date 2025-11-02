import { TaskStatus } from "../schemas";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  userId: string; // owner/assignee
  projectId: string; // new relation to Project
  createdAt: Date;
  updatedAt?: Date; // set by DB
  deletedAt?: Date | null; // soft-delete timestamp
}
