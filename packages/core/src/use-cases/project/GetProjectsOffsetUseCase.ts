import { IProjectRepository } from "@repo/infra";
import { TProjectOffsetPagination } from "@repo/shared";

export class GetProjectsOffsetUseCase {
  constructor(private readonly repo: IProjectRepository) {}

  async execute(input: TProjectOffsetPagination) {
    const limit =
      typeof input.limit === "string"
        ? parseInt(input.limit, 10)
        : (input.limit ?? 20);
    const offset =
      typeof input.offset === "string"
        ? parseInt(input.offset, 10)
        : (input.offset ?? 0);
    const sortDir =
      input.sortDir === "asc" || input.sortDir === "desc"
        ? input.sortDir
        : "desc";

    return this.repo.findAll({
      q: input.q?.trim() || undefined,
      ownerId: input.ownerId,
      limit,
      offset,
      includeDeleted: !!input.includeDeleted,
      sortBy: input.sortBy,
      sortDir,
    });
  }
}
