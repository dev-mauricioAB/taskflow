// @repo/core/users/use-cases/GetUserByIdUseCase.ts
import { IUserRepository } from "@repo/infra";
import { TUserParamsDto } from "@repo/shared";

export class GetUserByIdUseCase {
  constructor(private readonly repo: IUserRepository) {}

  async execute(params: TUserParamsDto) {
    return this.repo.findById(params.id);
  }
}
