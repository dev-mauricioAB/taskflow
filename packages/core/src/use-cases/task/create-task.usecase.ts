import { Task, TaskStatus } from "@repo/shared";

export class CreateTaskUseCase {
  execute(
    data: Omit<Task, "id" | "status" | "createdAt" | "updatedAt">
      & Partial<Pick<Task, "status">>
  ): Task {
    if (!data.title?.trim()) throw new Error("Title is required");
    const status: TaskStatus = data.status ?? "todo";
    return {
      id: crypto.randomUUID(),
      title: data.title.trim(),
      description: data.description ?? null,
      status,
      userId: data.userId,
      projectId: data.projectId,
      createdAt: new Date(),
    };
  }
}