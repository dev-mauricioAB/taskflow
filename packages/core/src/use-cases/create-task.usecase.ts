import { Task } from "../entities/task.entity";

export class CreateTaskUseCase {
  execute(data: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
    return {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date()
    };
  }
}
