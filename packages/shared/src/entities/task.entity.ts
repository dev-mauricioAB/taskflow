export type TaskStatus = "todo" | "inProgress" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  userId: string;          // owner/assignee
  projectId: string;       // new relation to Project
  createdAt: Date;
  updatedAt?: Date;        // set by DB
}
