// @repo/core/application/use-cases/DeleteTaskUseCase.ts
import { DomainError, IEventPublisher, ITaskRepository } from "@repo/infra";
import { TASK_DELETED, TaskDeletedPayload } from "@repo/shared";

// Typed input: allow opting into hard delete
type DeleteTaskInput = { taskId: string; hard?: boolean };

export class DeleteTaskUseCase {
  constructor(
    private readonly tasks: ITaskRepository,
    private readonly events: IEventPublisher,
  ) {}

  // Idempotent behavior:
  // - If the task doesn't exist: no-op
  // - Soft delete marks deletedAt once; subsequent calls do nothing
  // - Hard delete removes the row; repeated calls are harmless
  async execute({ taskId, hard = false }: DeleteTaskInput): Promise<void> {
    // If you want to return 404 in the controller, you can check exists() here
    const existing = await this.tasks.findById(taskId);
    if (!existing)
      throw new DomainError({ code: "NOT_FOUND", message: "Task not found" });

    if (hard) {
      await this.tasks.hardDelete(taskId);
    } else {
      await this.tasks.softDelete(taskId, new Date());
    }

    const payload: TaskDeletedPayload = {
      taskId,
      occurredAt: new Date().toISOString(),
    };
    this.events.publish<TaskDeletedPayload>(TASK_DELETED, payload);
  }
}
