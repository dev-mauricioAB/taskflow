import { Task } from "@repo/shared";

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findAll(): Promise<Task[]>;
  save(task: Task): Promise<void>;
  delete(id: string): Promise<void>;
  findByProjectId(projectId: string): Promise<Task[]>;
}
