// @repo/core/projects/use-cases/GetProjectByIdUseCase.ts
import { ProjectRepository } from "@repo/infra";
import { TProjectParamsDto } from "@repo/shared";

export class GetProjectByIdUseCase {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(params: TProjectParamsDto) {
    // place for read policies (tenant, soft-delete visibility) if needed
    return this.repo.findById(params.id);
  }
}
