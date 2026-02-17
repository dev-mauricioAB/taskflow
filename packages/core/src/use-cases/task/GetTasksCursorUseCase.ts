import { ITaskRepository } from "@repo/infra";
import { TTaskCursorPagination } from "@repo/shared";

export class GetTasksCursorUseCase {
  constructor(private readonly repo: ITaskRepository) {}

  async execute(input: TTaskCursorPagination) {
    const take =
      typeof input.take === "string"
        ? parseInt(input.take, 10)
        : (input.take ?? 20);
    const cursor =
      typeof input.cursor === "string"
        ? { id: input.cursor }
        : input.cursor
          ? { id: input.cursor.id }
          : undefined;
    const sortDir =
      input.sortDir === "asc" || input.sortDir === "desc"
        ? input.sortDir
        : "asc";
    const sortBy = input.sortBy ?? "id";
    return this.repo.findAllCursor({
      q: input.q,
      projectId: input.projectId,
      userId: input.userId,
      status: input.status,
      take,
      cursor,
      includeDeleted: !!input.includeDeleted,
      sortBy,
      sortDir,
    });
  }
}
