import { IEventPublisher, ITaskRepository } from "@repo/infra";
import { TASK_COMPLETED, TaskCompletedPayload } from "@repo/shared";

type Input = { taskId: string };
type Output = { success: boolean };

export class MarkTaskAsCompletedUseCase {
  constructor(
    private readonly tasks: ITaskRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute({ taskId }: Input): Promise<Output> {
    const completedAt = new Date();
    await this.tasks.markAsCompleted(taskId, completedAt);

    const payload: TaskCompletedPayload = {
      taskId,
      completedAt: completedAt.toISOString(),
    };
    this.events.publish<TaskCompletedPayload>(TASK_COMPLETED, payload);

    return { success: true };
  }
}
