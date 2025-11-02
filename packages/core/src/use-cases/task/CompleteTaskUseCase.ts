import { IEventPublisher, ITaskRepository } from "@repo/infra";
import { TASK_COMPLETED, TaskCompletedPayload } from "@repo/shared";

export class CompleteTaskUseCase {
  constructor(
    private readonly tasks: ITaskRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute(taskId: string, completedAt = new Date()): Promise<void> {
    const task = await this.tasks.findById(taskId);
    if (!task) return; // or throw NotFound per API contract

    if (task.status === "done") {
      // Idempotent: if already completed, don't emit a duplicate event
      return;
    }

    await this.tasks.markAsCompleted(taskId, completedAt);

    const payload: TaskCompletedPayload = {
      taskId,
      completedAt: completedAt.toISOString(),
    };
    this.events.publish<TaskCompletedPayload>(TASK_COMPLETED, payload);
  }
}
