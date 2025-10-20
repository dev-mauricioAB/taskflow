import { User } from "../entities/user.entity";

export class CreateUserUseCase {
  execute(data: Omit<User, "id" | "createdAt" | "updatedAt">): User {
    return {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
    };
  }
}
