// @repo/core/activities/use-cases/GetActivitiesByTaskIdUseCase.ts
import { ActivityRepository } from "@repo/infra";
import { TActivityParamsDto } from "@repo/shared";

export class GetActivitiesByTaskIdUseCase {
  constructor(private readonly repo: ActivityRepository) {}

  async execute(params: TActivityParamsDto) {
    // Place for policies: tenancy, authorization, soft-delete visibility, etc.
    return this.repo.findActivityByTaskId(params.id);
  }
}
