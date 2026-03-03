import { ITaskRepository } from "@repo/infra";
import {
  DEFAULT_OFFSET,
  DEFAULT_PAGE_LIMIT,
  DEFAULT_SORT_BY_TASK,
  DEFAULT_SORT_DIR,
  TTaskOffsetPagination,
} from "@repo/shared";

export class GetTasksOffsetUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(input: TTaskOffsetPagination) {
    const limit =
      typeof input.limit === "string"
        ? parseInt(input.limit, 10)
        : (input.limit ?? DEFAULT_PAGE_LIMIT);
    const offset =
      typeof input.offset === "string"
        ? parseInt(input.offset, 10)
        : (input.offset ?? DEFAULT_OFFSET);
    const sortDir =
      input.sortDir === "asc" || input.sortDir === "desc"
        ? input.sortDir
        : DEFAULT_SORT_DIR;
    const sortBy = input.sortBy ?? DEFAULT_SORT_BY_TASK;
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
