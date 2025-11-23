// @repo/core/users/use-cases/GetUserByIdUseCase.ts
import { UserRepository } from "@repo/infra";
import { TUserParamsDto } from "@repo/shared";

export class GetUserByIdUseCase {
  constructor(private readonly repo: UserRepository) {}

  async execute(params: TUserParamsDto) {
    return this.repo.findById(params.id);
  }
}
