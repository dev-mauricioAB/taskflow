// @repo/core/activities/use-cases/GetActivitiesByTaskIdUseCase.ts
import { IActivityRepository } from "@repo/infra";
import { TActivityParamsDto } from "@repo/shared";

export class GetActivitiesByTaskIdUseCase {
  constructor(private readonly repo: IActivityRepository) {}

  async execute(params: TActivityParamsDto) {
    // Place for policies: tenancy, authorization, soft-delete visibility, etc.
    return this.repo.findActivityByTaskId(params.id);
  }
}
