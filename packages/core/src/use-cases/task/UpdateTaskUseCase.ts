// @repo/core/application/use-cases/UpdateTaskUseCase.ts
import {
  DomainError,
  IEventPublisher,
  ITaskRepository,
  NewEntity,
} from "@repo/infra";
import {
  TASK_STATUS_CHANGED,
  TaskStatusChangedPayload,
  Task,
  TaskStatus,
} from "@repo/shared";

// DTO-shaped input for convenience
type UpdateTaskInput = {
  id: string;
  patch: Partial<
    Pick<Task, "title" | "description" | "status" | "userId" | "projectId">
  >;
  actorId?: string; // optional for auditing who changed the status
};

export class UpdateTaskUseCase {
  constructor(
    private readonly tasks: ITaskRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute(
    id: string,
    patch: NewEntity<Partial<Task>>,
  ): Promise<{ changed: Record<string, unknown> }> {
    const task = await this.tasks.findById(id);
    if (!task)
      throw new DomainError({ code: "NOT_FOUND", message: "Task not found" });

    // Normalize incoming strings
    const normalized = {} as NewEntity<Task>;
    if (patch.title !== undefined) normalized.title = patch.title?.trim();
    if (patch.description !== undefined)
      normalized.description = patch.description?.trim();
    if (patch.status !== undefined)
      normalized.status = patch.status as TaskStatus;
    if (patch.userId !== undefined) normalized.userId = patch.userId;
    if (patch.projectId !== undefined) normalized.projectId = patch.projectId;

    // Detect status change to emit event later
    const statusChanging =
      normalized.status !== undefined && normalized.status !== task.status;
    const oldStatus = task.status;
    const newStatus = normalized.status ?? task.status;

    // Persist minimal patch
    const result = await this.tasks.update(id, normalized);

    // Only publish when a real status transition occurred
    if (statusChanging) {
      const payload: TaskStatusChangedPayload = {
        taskId: id,
        oldStatus,
        newStatus: newStatus as TaskStatus,
        actorId: patch.projectId ?? "system",
        occurredAt: new Date().toISOString(),
      };
      this.events.publish<TaskStatusChangedPayload>(
        TASK_STATUS_CHANGED,
        payload,
      );
    }

    return result;
  }
}
