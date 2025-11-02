// Imports from core ports and shared contracts
import { IEventPublisher, ITaskRepository } from "@repo/infra";
import {
  Task,
  TaskStatus,
  TASK_STATUS_CHANGED,
  TaskStatusChangedPayload,
} from "@repo/shared";

type Input = { task: Task; newStatus: TaskStatus; actorId: string };
type Output = { updatedTask: Task };

export class UpdateTaskStatusUseCase {
  constructor(
    private readonly tasks: ITaskRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute({ task, newStatus, actorId }: Input): Promise<Output> {
    const updatedTask: Task = {
      ...task,
      status: newStatus,
      updatedAt: new Date(),
    };

    await this.tasks.save(updatedTask);

    const payload: TaskStatusChangedPayload = {
      taskId: task.id,
      oldStatus: task.status,
      newStatus,
      actorId,
      occurredAt: new Date().toISOString(),
    };
    this.events.publish<TaskStatusChangedPayload>(TASK_STATUS_CHANGED, payload);

    return { updatedTask };
  }
}
