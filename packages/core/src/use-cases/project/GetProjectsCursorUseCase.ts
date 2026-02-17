// @repo/core/projects/use-cases/GetProjectsCursorUseCase.ts
import { IProjectRepository } from "@repo/infra";
import { TProjectCursorPagination } from "@repo/shared";

export class GetProjectsCursorUseCase {
  constructor(private readonly repo: IProjectRepository) {}

  async execute(input: TProjectCursorPagination) {
    // Signed take already coerced and bounded by your DTO; still clamp defensively
    const take =
      typeof input.take === "string"
        ? parseInt(input.take, 10)
        : (input.take ?? 20);

    // Accept your union cursor: string | { id: string }
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
      q: input.q,
      ownerId: input.ownerId,
      take,
      cursor,
      includeDeleted: !!input.includeDeleted,
      sortBy: input.sortBy,
      sortDir,
    });
  }
}
