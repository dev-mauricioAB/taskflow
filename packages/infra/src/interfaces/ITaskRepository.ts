import { Task } from "@repo/shared";
import { IRepository } from "./IRepository";

export interface ITaskRepository extends IRepository<Task, string> {
  findAll(): Promise<Task[]>;
  findByProjectId(projectId: string): Promise<Task[]>;
  markAsCompleted(taskId: string, completedAt: Date): Promise<void>;
}
