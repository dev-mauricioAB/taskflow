export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "inProgress" | "done";
  userId: string;
  createdAt: Date;
  updatedAt?: Date;
}
