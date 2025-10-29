import { Task, TaskStatus, Activity } from "@repo/shared";

export class UpdateTaskStatusUseCase {
  execute(params: {
    task: Task;
    newStatus: TaskStatus;
    actorId: string;
  }): { updatedTask: Task; activity: Activity } {
    const updatedTask: Task = {
      ...params.task,
      status: params.newStatus,
      updatedAt: new Date(),
    };
    const activity: Activity = {
      id: crypto.randomUUID(),
      taskId: params.task.id,
      actorId: params.actorId,
      type: "status_changed",
      message: `Status: ${params.task.status} -> ${params.newStatus}`,
      createdAt: new Date(),
    };
    return { updatedTask, activity };
  }
}