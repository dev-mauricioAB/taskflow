export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  userId: string;
  createdAt: Date;
  updatedAt?: Date;
}
