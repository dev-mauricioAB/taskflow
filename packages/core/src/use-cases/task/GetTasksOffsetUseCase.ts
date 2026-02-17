import { ITaskRepository } from "@repo/infra";
import { TTaskOffsetPagination } from "@repo/shared";

export class GetTasksOffsetUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(input: TTaskOffsetPagination) {
    const limit = typeof input.limit === "number" ? input.limit : 20;
    const offset = typeof input.offset === "number" ? input.offset : 0;
    const sortDir =
      input.sortDir === "asc" || input.sortDir === "desc"
        ? input.sortDir
        : "desc";
    const sortBy = input.sortBy ?? "createdAt";
    return this.repo.findAll({
      q: input.q,
      projectId: input.projectId,
      userId: input.userId,
      status: input.status,
      limit,
      offset,
      includeDeleted: !!input.includeDeleted,
      sortBy,
      sortDir,
    });
  }
}
