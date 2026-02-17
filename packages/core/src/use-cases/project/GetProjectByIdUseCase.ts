// @repo/core/projects/use-cases/GetProjectByIdUseCase.ts
import { IProjectRepository } from "@repo/infra";
import { TProjectParamsDto } from "@repo/shared";

export class GetProjectByIdUseCase {
  constructor(private readonly repo: IProjectRepository) {}

  async execute(params: TProjectParamsDto) {
    // place for read policies (tenant, soft-delete visibility) if needed
    return this.repo.findById(params.id);
  }
}
