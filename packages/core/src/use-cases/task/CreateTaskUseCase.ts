import {
  DomainError,
  IEventPublisher,
  ITaskRepository,
  NewEntity,
} from "@repo/infra";
import { Task, TASK_CREATED, TaskCreatedPayload } from "@repo/shared";

export class CreateTaskUseCase {
  constructor(
    private readonly tasks: ITaskRepository,
    private readonly events: IEventPublisher,
  ) {}

  async execute(input: NewEntity<Task>): Promise<Task> {
    if (!input.title?.trim()) {
      throw new DomainError({
        code: "VALIDATION_FAILED",
        message: " Task title is required",
      });
    }

    const task = await this.tasks.create(input);

    const payload: TaskCreatedPayload = {
      taskId: task.id,
      title: task.title,
      createdAt: new Date().toISOString(),
    };
    this.events.publish(TASK_CREATED, payload);

    return task;
  }
}
