import { IUserRepository } from "@repo/infra";
import { TUserCursorPagination } from "@repo/shared";

export class GetUsersCursorUseCase {
  constructor(private readonly repo: IUserRepository) {}

  async execute(input: TUserCursorPagination) {
    const take =
      typeof input.take === "number"
        ? Math.max(-100, Math.min(100, input.take))
        : 20;
    const cursor =
      typeof input.cursor === "string"
        ? { id: input.cursor }
        : input.cursor
          ? { id: input.cursor.id }
          : undefined;
    const sortDir =
      input.sortDir === "asc" || input.sortDir === "desc"
        ? input.sortDir
        : "desc";

    return this.repo.findAllCursor({
      q: input.q?.trim(),
      take,
      cursor,
      includeDeleted: !!input.includeDeleted,
      sortBy: input.sortBy,
      sortDir,
    });
  }
}
