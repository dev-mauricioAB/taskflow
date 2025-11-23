import { UserRepository } from "@repo/infra";
import { TUserOffsetPagination } from "@repo/shared";

export class GetUsersOffsetUseCase {
  constructor(private readonly repo: UserRepository) {}

  async execute(input: TUserOffsetPagination) {
    const limit =
      typeof input.limit === "string"
        ? parseInt(input.limit)
        : (input.limit ?? 20);
    const offset =
      typeof input.offset === "string"
        ? parseInt(input.offset)
        : (input.offset ?? 0);
    const sortDir =
      input.sortDir === "asc" || input.sortDir === "desc"
        ? input.sortDir
        : "desc";

    return this.repo.findAll({
      q: input.q?.trim(),
      limit,
      offset,
      includeDeleted: !!input.includeDeleted,
      sortBy: input.sortBy,
      sortDir,
    });
  }
}
