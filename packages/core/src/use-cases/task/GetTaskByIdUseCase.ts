// @repo/core/tasks/use-cases/GetTaskByIdUseCase.ts
import { DomainError, ITaskRepository } from "@repo/infra";
import { TTaskParamsDto } from "@repo/shared";

export class GetTaskByIdUseCase {
  constructor(private readonly repo: ITaskRepository) {}
  async execute(params: TTaskParamsDto) {
    const task = await this.repo.findById(params.id);

    if (!task) {
      throw new DomainError({ code: "NOT_FOUND", message: "Task not found" });
    }

    return task;
  }
}
