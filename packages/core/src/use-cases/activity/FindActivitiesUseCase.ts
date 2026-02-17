// @repo/core/activities/use-cases/FindActivitiesUseCase.ts
import { IActivityRepository } from "@repo/infra";
import { TActivityQueryDto } from "@repo/shared";

export class FindActivitiesUseCase {
  constructor(private readonly repo: IActivityRepository) {}

  async execute(query: TActivityQueryDto) {
    // Normalize inputs (e.g., trim if you allow free text in future)
    return this.repo.findMany({
      taskId: query.taskId,
      actorId: query.actorId,
      type: query.type,
    });
  }
}
