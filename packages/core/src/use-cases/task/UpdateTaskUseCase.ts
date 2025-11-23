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
  TUpdateTaskDto,
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
    // 1) Load current to validate existence and detect transitions
    const task = await this.tasks.findById(id);
    if (!task) {
      throw new DomainError({ code: "NOT_FOUND", message: "Task not found" });
    }

    // 2) Normalize incoming fields
    const normalized: Record<string, unknown> = {};
    if (patch.title !== undefined) normalized.title = patch.title?.trim();
    if (patch.description !== undefined)
      normalized.description = patch.description?.trim();
    if (patch.status !== undefined)
      normalized.status = patch.status as TaskStatus;
    if (patch.userId !== undefined) normalized.userId = patch.userId;
    if (patch.projectId !== undefined) normalized.projectId = patch.projectId;

    // 3) Determine intended keys (ignore undefined)
    const intended = (
      Object.keys(normalized) as (keyof typeof normalized)[]
    ).filter((k) => normalized[k] !== undefined);

    if (intended.length === 0) {
      return { changed: {} };
    }

    // 4) Detect status transition
    const statusChanging =
      normalized.status !== undefined && normalized.status !== task.status;
    const oldStatus = task.status;
    const newStatus =
      (normalized.status as TaskStatus | undefined) ?? task.status;

    // 5) Persist minimal patch via repository (pure persistence concern)
    const updated: TUpdateTaskDto | null = await this.tasks.update(
      id,
      normalized,
    );
    if (!updated) {
      // Defensive: if update failed by concurrent deletion
      throw new DomainError({ code: "NOT_FOUND", message: "Task not found" });
    }

    // 6) Compute changed from intended ∩ returned projection
    const changed: Record<string, unknown> = {};
    for (const key of intended) {
      if (key in updated) {
        changed[key as string] = (updated as any)[key as string];
      }
    }

    // 7) Publish status change event only on real transition
    if (statusChanging) {
      const payload: TaskStatusChangedPayload = {
        taskId: id,
        oldStatus: oldStatus as TaskStatus,
        newStatus: newStatus as TaskStatus,
        actorId: patch.userId ?? "system",
        occurredAt: new Date().toISOString(),
      };
      this.events.publish<TaskStatusChangedPayload>(
        TASK_STATUS_CHANGED,
        payload,
      );
    }

    return { changed };
  }
}
